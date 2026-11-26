using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using TheCorner.Web;

namespace TheCornerWorld.Web;

// The Corner World's settings for TheCorner.Web, and how it serves the pages in docs/.
public static class WorldSite
{
    // The trip pages style themselves inline (each day's calendar is laid out in style attributes),
    // so they can't keep to the site's own policy. Client pages also show the unlocked trip from a
    // blob: address made in the browser (assets/unlock.js). Both still load and talk to nothing
    // outside the site, take no forms, and can't be framed.
    const string TripPolicy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
    const string ClientPolicy = "default-src 'self'; script-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

    // No accounts yet (W-014 waits for its Supabase project), and no analytics until W-003 is
    // decided: the browser talks to thecornerworld.com and nothing else, as the static site did.
    public static readonly SiteSettings Settings = new()
    {
        Name = "world",
        Production = new("production", "thecornerworld.com"),
        Staging = new("staging", "staging.thecornerworld.com"),
        PagePolicies = [("/plan/samples/", TripPolicy), ("/c/", ClientPolicy)],
    };

    // Where the pages are: wwwroot when published, the repository's docs/ when run from here
    public static string Root(string contentRoot)
    {
        var published = Path.Combine(contentRoot, "wwwroot");
        if (File.Exists(Path.Combine(published, "index.html"))) return published;
        return Path.GetFullPath(Path.Combine(contentRoot, "..", "..", "docs"));
    }

    public static FileExtensionContentTypeProvider ContentTypes()
    {
        var types = new FileExtensionContentTypeProvider();
        types.Mappings[".webmanifest"] = "application/manifest+json";
        types.Mappings[".lock"] = "application/octet-stream";
        return types;
    }

    // How long browsers and Cloudflare may keep a file. Pages: always ask again (they change with
    // each build). Scripts and styles named with their version (?v=, written by build:version):
    // a year, since a new version is a new address. Anything else: an hour.
    public static string CacheControl(string path, string query, string? contentType)
    {
        if (contentType?.StartsWith("text/html", StringComparison.Ordinal) == true) return "no-cache";
        if (path.StartsWith("/c/", StringComparison.Ordinal)) return "no-cache";
        if (path.StartsWith("/assets/", StringComparison.Ordinal) && query.Contains("v=", StringComparison.Ordinal)) return "public, max-age=31536000, immutable";
        return "public, max-age=3600";
    }

    // A folder asked for without its closing slash (/places/japan) goes to it with the slash, as
    // GitHub Pages did, so every page has one address and its relative links work.
    public static string? FolderRedirect(IFileProvider files, string path, string query)
    {
        if (path.EndsWith('/') || Path.HasExtension(path)) return null;
        return files.GetFileInfo(path.TrimEnd('/') + "/index.html").Exists ? $"{path}/{query}" : null;
    }
}
