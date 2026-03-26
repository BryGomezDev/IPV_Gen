<%@ WebHandler Language="C#" Class="AdminHandler" %>

using System;
using System.IO;
using System.Web;
using System.Web.Script.Serialization;

/// <summary>
/// Handlers de lectura/escritura de config.json para el panel de administración.
/// GET  ?action=get&amp;pwd=CONTRASEÑA  → devuelve config.json
/// POST ?action=set&amp;pwd=CONTRASEÑA  (body = JSON) → sobreescribe config.json
/// </summary>
public class AdminHandler : IHttpHandler
{
    // ── Contraseña hardcodeada ──────────────────────────────────────────────
    private const string PASSWORD = "devtools2024";
    // ───────────────────────────────────────────────────────────────────────

    public void ProcessRequest(HttpContext context)
    {
        HttpResponse response = context.Response;
        HttpRequest  request  = context.Request;

        response.ContentType = "application/json; charset=utf-8";
        response.Cache.SetCacheability(HttpCacheability.NoCache);
        response.Cache.SetNoStore();

        // CORS para desarrollo local (mismo origen en producción, pero no hace daño)
        response.AddHeader("Access-Control-Allow-Origin", "*");
        response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.AddHeader("Access-Control-Allow-Headers", "Content-Type");

        if (request.HttpMethod == "OPTIONS")
        {
            response.StatusCode = 200;
            return;
        }

        string configPath = context.Server.MapPath("~/config.json");
        string action     = (request.QueryString["action"] ?? "").ToLowerInvariant().Trim();
        string pwd        = request.QueryString["pwd"] ?? "";

        // Verificar contraseña
        if (pwd != PASSWORD)
        {
            response.StatusCode = 401;
            response.Write("{\"error\":\"No autorizado\"}");
            return;
        }

        if (request.HttpMethod == "GET" && action == "get")
        {
            // ── Leer config ────────────────────────────────────────────────
            if (!File.Exists(configPath))
            {
                response.StatusCode = 404;
                response.Write("{\"error\":\"config.json no encontrado en el servidor\"}");
                return;
            }

            string content = File.ReadAllText(configPath, System.Text.Encoding.UTF8);
            response.Write(content);
        }
        else if (request.HttpMethod == "POST" && action == "set")
        {
            // ── Escribir config ────────────────────────────────────────────
            string body;
            using (var reader = new StreamReader(request.InputStream, System.Text.Encoding.UTF8))
                body = reader.ReadToEnd();

            if (string.IsNullOrWhiteSpace(body))
            {
                response.StatusCode = 400;
                response.Write("{\"error\":\"Cuerpo de la petición vacío\"}");
                return;
            }

            // Validar que el body sea JSON válido antes de escribir
            try
            {
                new JavaScriptSerializer().DeserializeObject(body);
            }
            catch (Exception)
            {
                response.StatusCode = 400;
                response.Write("{\"error\":\"El cuerpo no es un JSON válido\"}");
                return;
            }

            try
            {
                File.WriteAllText(configPath, body, System.Text.Encoding.UTF8);
                response.Write("{\"ok\":true}");
            }
            catch (Exception ex)
            {
                response.StatusCode = 500;
                response.Write("{\"error\":\"Error al escribir el fichero: " +
                    ex.Message.Replace("\"", "'") + "\"}");
            }
        }
        else
        {
            response.StatusCode = 400;
            response.Write("{\"error\":\"Acción no válida. Usa action=get (GET) o action=set (POST)\"}");
        }
    }

    public bool IsReusable { get { return false; } }
}
