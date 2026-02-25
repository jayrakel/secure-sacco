package com.jaytechwave.sacco.modules.core.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.security.jackson2.SecurityJackson2Modules;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisIndexedHttpSession;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.session.web.http.CookieSerializer;

@Configuration
@EnableRedisIndexedHttpSession
public class SessionConfig {

    @Value("${server.servlet.session.cookie.secure:true}")
    private boolean secureCookie;

    @Value("${server.servlet.session.cookie.same-site:Strict}")
    private String sameSite;

    @Bean
    public RedisSerializer<Object> springSessionDefaultRedisSerializer() {
        ObjectMapper mapper = new ObjectMapper();
        // Register Spring Security Jackson modules to handle Principal/Authorities
        mapper.registerModules(SecurityJackson2Modules.getModules(getClass().getClassLoader()));
        return new GenericJackson2JsonRedisSerializer(mapper);
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