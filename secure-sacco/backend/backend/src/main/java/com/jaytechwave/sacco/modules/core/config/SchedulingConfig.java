package com.jaytechwave.sacco.modules.core.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulingConfig {
    // This tells Spring Boot to wake up background @Scheduled jobs!
}