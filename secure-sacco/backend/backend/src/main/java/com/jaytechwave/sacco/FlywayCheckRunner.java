package com.jaytechwave.sacco;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.core.env.Environment;
@Component
public class FlywayCheckRunner implements CommandLineRunner {
    private final Environment env;
    public FlywayCheckRunner(Environment env) {
        this.env = env;
    }
    @Override
    public void run(String... args) {
        System.out.println("FLYWAY ENABLED: " + env.getProperty("spring.flyway.enabled"));
        System.out.println("FLYWAY LOCATIONS: " + env.getProperty("spring.flyway.locations"));
        System.out.println("FLYWAY OUT OF ORDER: " + env.getProperty("spring.flyway.out-of-order"));
    }
}
