package com.jaytechwave.sacco.modules.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.serializer.JdkSerializationRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisIndexedHttpSession;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration
@EnableRedisIndexedHttpSession(
        redisNamespace = "${spring.session.redis.namespace:spring:session}",
        maxInactiveIntervalInSeconds = 1800
)
public class SessionConfig {

    @Value("${server.servlet.session.cookie.secure:true}")
    private boolean secureCookie;

    @Value("${server.servlet.session.cookie.same-site:Strict}")
    private String sameSite;

    // --- FIX: Switch from Jackson JSON to standard Java Serialization ---
    @Bean
    public RedisSerializer<Object> springSessionDefaultRedisSerializer() {
        return new JdkSerializationRedisSerializer();
    }

    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName("SACCO_SESSION");
        serializer.setUseHttpOnlyCookie(true);
        // --- DYNAMIC PROPERTIES ---
        serializer.setUseSecureCookie(secureCookie);
        serializer.setSameSite(sameSite);
        return serializer;
    }
}