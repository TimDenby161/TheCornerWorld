using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.FileProviders;
using TheCorner.Web;
using TheCornerWorld.Web;

var builder = WebApplication.CreateBuilder(args);

// Which copy of the site this server is: the app setting SITE_ENV. None named, no start.
var site = WorldSite.Settings;
var env = site.Choose(builder.Configuration["SITE_ENV"]);
var root = builder.Configuration["SITE_ROOT"] ?? WorldSite.Root(builder.Environment.ContentRootPath);
var files = new PhysicalFileProvider(root);

// Azure's front door and Cloudflare say which address and scheme the visitor used. The host is
// taken only when it names this site, so no request can make the server write another address.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
    o.AllowedHosts = [env.Host, $"www.{env.Host}"];
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseGate(site, env);
app.UseOriginCheck(site);

app.Use(async (context, next) =>
{
    if (WorldSite.FolderRedirect(files, context.Request.Path.Value ?? "/", context.Request.QueryString.Value ?? "") is { } to)
    {
        context.Response.StatusCode = 301;
        context.Response.Headers.Location = to;
        return;
    }
    await next(context);
});
app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = files });
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = files,
    ContentTypeProvider = WorldSite.ContentTypes(),
    OnPrepareResponse = c => c.Context.Response.Headers.CacheControl =
        WorldSite.CacheControl(c.Context.Request.Path.Value ?? "/", c.Context.Request.QueryString.Value ?? "", c.Context.Response.ContentType),
});

// Routing after the files: otherwise the not-found fallback claims folder addresses (/places/japan/)
// before their index.html is found
app.UseRouting();

app.MapVersion(site, env, builder.Configuration["COMMIT"]);
app.MapRobots(env);
// Anything else: the site's not-found answer, with the same headers as every page
app.MapFallback((HttpContext c) =>
{
    c.Response.Headers.CacheControl = "no-cache";
    return Results.Content("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Not found | The Corner World</title>" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><link rel=\"stylesheet\" href=\"/assets/styles.css\"></head>" +
        "<body class=\"page\"><main><h1>Page not found</h1><p class=\"lede\">That page doesn't exist. <a href=\"/\">Go to the map</a> or " +
        "<a href=\"/places/\">see every place</a>.</p></main></body></html>", "text/html; charset=utf-8", statusCode: 404);
});

app.Run();

// for the tests (WebApplicationFactory)
public partial class Program;
