package com.jaytechwave.sacco;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisIndexedHttpSession;

import java.util.TimeZone;

@SpringBootApplication
@EnableRedisIndexedHttpSession
@EnableAsync
public class BackendApplication {

    public static void main(String[] args) {
        // SAC-227: set JVM default timezone to EAT before Spring context loads
        // so all LocalDateTime.now() calls and Hibernate use Africa/Nairobi
        TimeZone.setDefault(TimeZone.getTimeZone("Africa/Nairobi"));
        SpringApplication.run(BackendApplication.class, args);
    }

}