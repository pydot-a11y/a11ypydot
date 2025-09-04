

package com.ms.msde.szr.workspaceplugin.http;

import org.apache.hc.client5.http.auth.AuthSchemeFactory;
import org.apache.hc.client5.http.auth.StandardAuthScheme;
import org.apache.hc.client5.http.impl.DefaultRedirectStrategy;
import org.apache.hc.client5.http.impl.auth.BasicSchemeFactory;
import org.apache.hc.client5.http.impl.auth.SPNegoSchemeFactory;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.cookie.BasicCookieStore;
import org.apache.hc.client5.http.cookie.CookieStore;
import org.apache.hc.core5.http.config.Lookup;
import org.apache.hc.core5.http.config.RegistryBuilder;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

public final class RestTemplateConfig {
  private final CookieStore cookieStore = new BasicCookieStore();
  private final RestTemplate restTemplate;

  public RestTemplateConfig() {
    // Install corp Kerberos provider if present (safe no-op if absent)
    try {
      Class.forName("com.ms.security.MSKerberosJgssProvider").getMethod("install").invoke(null);
      Class.forName("com.ms.security.MSKerberosConfiguration").getMethod("setClientConfiguration").invoke(null);
    } catch (Throwable ignore) {}

    Lookup<AuthSchemeFactory> auth = RegistryBuilder.<AuthSchemeFactory>create()
      .register(StandardAuthScheme.SPNEGO, new SPNegoSchemeFactory(true))
      .register(StandardAuthScheme.BASIC,  new BasicSchemeFactory())
      .build();

    CloseableHttpClient http = HttpClients.custom()
      .setDefaultAuthSchemeRegistry(auth)
      .setRedirectStrategy(new DefaultRedirectStrategy())
      .setDefaultCookieStore(cookieStore)
      .build();

    var rf = new HttpComponentsClientHttpRequestFactory(http);
    rf.setConnectTimeout(10_000);
    rf.setReadTimeout(20_000);

    this.restTemplate = new RestTemplate(rf);
  }

  public RestTemplate rest() { return restTemplate; }
  public CookieStore cookies() { return cookieStore; }
}