package com.jaytechwave.sacco.modules.core.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.security.jackson2.SecurityJackson2Modules;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.session.web.http.CookieSerializer;

@Configuration
@EnableRedisHttpSession
public class SessionConfig {

    /**
     * Driven by server.servlet.session.cookie.secure in application.yml.
     * Defaults to true; set to false in application-dev.yml for local HTTP.
     */
    @Value("${server.servlet.session.cookie.secure:true}")
    private boolean secureCookie;

    /**
     * Custom Redis Serializer to ensure User Principals and SecurityContext
     * are serialized as JSON instead of binary Java serialization.
     */
    @Bean
    public RedisSerializer<Object> springSessionDefaultRedisSerializer() {
        ObjectMapper mapper = new ObjectMapper();
        // Register Spring Security Jackson modules to handle Principal/Authorities
        mapper.registerModules(SecurityJackson2Modules.getModules(getClass().getClassLoader()));
        return new GenericJackson2JsonRedisSerializer(mapper);
    }

    /**
     * Explicitly configures the session cookie flags.
     * The Secure flag is profile-driven so local HTTP dev still works.
     */
    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName("SACCO_SESSION");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(secureCookie);  // false in dev profile, true otherwise
        serializer.setSameSite("Strict");
        serializer.setCookiePath("/");
        return serializer;
    }
}