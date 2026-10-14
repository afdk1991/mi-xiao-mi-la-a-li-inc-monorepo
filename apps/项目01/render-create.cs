using System;
using System.Net;
using System.IO;
using System.Text;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        string key = "rnd_3QGviiovcLwibn03GJY14fVNiH1D";
        string json = @"{
  ""name"": ""mi-xiao-mi-la-a-li-backend"",
  ""environment"": ""docker"",
  ""region"": ""singapore"",
  ""plan"": ""free"",
  ""branch"": ""main"",
  ""repo"": ""https://github.com/afdk1991/Mi-Xiao-Mi-La-A-Li-Inc"",
  ""dockerfilePath"": ""./Dockerfile"",
  ""dockerContext"": ""."",
  ""autoDeploy"": true,
  ""healthCheckPath"": ""/health"",
  ""envVars"": [
    {""key"": ""NODE_ENV"", ""value"": ""production""},
    {""key"": ""JWT_SECRET"", ""generateValue"": true}
  ]
}";
        byte[] bytes = Encoding.UTF8.GetBytes(json);

        var req = (HttpWebRequest)WebRequest.Create("https://api.render.com/v1/services");
        req.Method = "POST";
        req.ContentType = "application/json";
        req.Accept = "application/json";
        req.Headers.Add("Authorization", "Bearer " + key);
        req.ContentLength = bytes.Length;

        try
        {
            using (var s = req.GetRequestStream())
            {
                s.Write(bytes, 0, bytes.Length);
            }
            var resp = (HttpWebResponse)req.GetResponse();
            string body = new StreamReader(resp.GetResponseStream()).ReadToEnd();
            Console.WriteLine("SUCCESS " + (int)resp.StatusCode);
            Console.WriteLine(body);
        }
        catch (WebException e)
        {
            var resp = (HttpWebResponse)e.Response;
            Console.WriteLine("ERROR " + (int)resp.StatusCode + " " + resp.StatusDescription);
            string body = new StreamReader(resp.GetResponseStream()).ReadToEnd();
            Console.WriteLine(body);
        }
    }
}
