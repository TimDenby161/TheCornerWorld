using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace TheCornerWorld.Web.Tests;

public sealed class World(string env) : WebApplicationFactory<Program>
{
    public static readonly string Docs = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "docs"));
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("SITE_ENV", env);
        builder.UseSetting("SITE_ROOT", Docs);
        builder.UseSetting("COMMIT", "test");
    }
    public HttpClient Client(string host) => CreateClient(new() { AllowAutoRedirect = false, BaseAddress = new Uri($"https://{host}/") });
}

public class SiteTests : IClassFixture<SiteTests.Live>
{
    public sealed class Live() : IDisposable
    {
        public World Site { get; } = new("production");
        public void Dispose() => Site.Dispose();
    }
    readonly HttpClient web;
    public SiteTests(Live live) => web = live.Site.Client("thecornerworld.com");

    static string Csp(HttpResponseMessage r) => r.Headers.GetValues("Content-Security-Policy").Single();

    [Fact]
    public async Task The_map_page_is_served_with_a_policy_that_allows_nothing_outside()
    {
        var r = await web.GetAsync("/");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Contains("<title>The Corner World", await r.Content.ReadAsStringAsync());
        var csp = Csp(r);
        Assert.DoesNotContain("https://", csp);
        Assert.DoesNotContain("unsafe-inline", csp);
        Assert.Contains("frame-ancestors 'none'", csp);
        Assert.Equal("max-age=31536000; includeSubDomains", r.Headers.GetValues("Strict-Transport-Security").Single());
        Assert.Equal("no-cache", r.Headers.CacheControl!.ToString());
    }

    [Fact]
    public async Task Every_place_page_keeps_its_address()
    {
        foreach (var slug in Directory.GetDirectories(Path.Combine(World.Docs, "places")).Select(Path.GetFileName).Take(25))
        {
            var r = await web.GetAsync($"/places/{slug}/");
            Assert.Equal(HttpStatusCode.OK, r.StatusCode);
            Assert.Contains($"places/{slug}/", await r.Content.ReadAsStringAsync());
        }
    }

    [Fact]
    public async Task A_folder_without_its_slash_goes_to_it_with_one()
    {
        var r = await web.GetAsync("/places/japan?x=1");
        Assert.Equal(HttpStatusCode.MovedPermanently, r.StatusCode);
        Assert.Equal("/places/japan/?x=1", r.Headers.Location!.ToString());
    }

    [Fact]
    public async Task Trip_pages_get_their_own_policy_and_still_cant_be_framed()
    {
        var sample = await web.GetAsync("/plan/samples/japan/");
        Assert.Equal(HttpStatusCode.OK, sample.StatusCode);
        Assert.Contains("style-src 'self' 'unsafe-inline'", Csp(sample));
        Assert.DoesNotContain("blob:", Csp(sample));
        Assert.Contains("frame-ancestors 'none'", Csp(sample));
        var client = await web.GetAsync("/c/jnjf-lofoten/");
        Assert.Contains("script-src 'self' blob:", Csp(client));
        Assert.Contains("frame-ancestors 'none'", Csp(client));
        Assert.Equal("no-cache", client.Headers.CacheControl!.ToString());
        // and nowhere else
        Assert.DoesNotContain("unsafe-inline", Csp(await web.GetAsync("/plan/")));
    }

    [Fact]
    public async Task A_clients_trip_is_served_only_as_its_locked_file()
    {
        var r = await web.GetAsync("/c/jnjf-lofoten/trip.lock");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal("application/octet-stream", r.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task Versioned_scripts_are_kept_a_year_and_others_an_hour()
    {
        var versioned = await web.GetAsync("/assets/app.js?v=abc");
        Assert.Equal("public, max-age=31536000, immutable", versioned.Headers.CacheControl!.ToString());
        Assert.False(versioned.Headers.Contains("Content-Security-Policy"));
        Assert.Equal("public, max-age=3600", (await web.GetAsync("/data/site.json")).Headers.CacheControl!.ToString());
        Assert.Equal("application/manifest+json", (await web.GetAsync("/manifest.webmanifest")).Content.Headers.ContentType!.MediaType);
    }

    [Theory]
    [InlineData("/../package.json")]
    [InlineData("/%2e%2e/package.json")]
    [InlineData("/no-such-page/")]
    public async Task Nothing_outside_the_site_is_served(string path)
    {
        var r = await web.GetAsync(path);
        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
        Assert.DoesNotContain("\"devDependencies\"", await r.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task A_post_from_another_site_is_refused()
    {
        var m = new HttpRequestMessage(HttpMethod.Post, "/") { Content = new StringContent("x") };
        m.Headers.Add("Origin", "https://evil.example");
        Assert.Equal(HttpStatusCode.Forbidden, (await web.SendAsync(m)).StatusCode);
    }

    [Fact]
    public async Task Www_and_http_go_to_the_site()
    {
        var r = await (new World("production")).Client("www.thecornerworld.com").GetAsync("/places/");
        Assert.Equal("https://thecornerworld.com/places/", r.Headers.Location!.ToString());
    }

    [Fact]
    public async Task The_live_site_may_be_crawled_and_says_what_it_is()
    {
        Assert.Contains("Sitemap: https://thecornerworld.com/sitemap.xml", await web.GetStringAsync("/robots.txt"));
        Assert.Contains("\"environment\":\"production\"", await web.GetStringAsync("/version"));
        Assert.Contains("places/japan/", await web.GetStringAsync("/sitemap.xml"));
    }
}

public class StagingTests
{
    [Fact]
    public async Task Staging_is_never_for_search_engines_and_never_answers_for_the_live_site()
    {
        using var staging = new World("staging");
        var web = staging.Client("staging.thecornerworld.com");
        var r = await web.GetAsync("/");
        Assert.Equal("noindex, nofollow", r.Headers.GetValues("X-Robots-Tag").Single());
        Assert.Contains("Disallow: /", await web.GetStringAsync("/robots.txt"));
        Assert.Equal(HttpStatusCode.InternalServerError, (await staging.Client("thecornerworld.com").GetAsync("/")).StatusCode);
    }

    [Fact]
    public void A_server_that_doesnt_say_which_copy_it_is_wont_start()
    {
        using var unnamed = new World("");
        Assert.ThrowsAny<Exception>(() => unnamed.CreateClient());
    }
}
