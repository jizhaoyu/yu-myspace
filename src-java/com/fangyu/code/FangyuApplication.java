package com.fangyu.code;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;

import com.fangyu.code.bootstrap.DesktopRuntime;
import com.fangyu.code.config.FangyuProperties;

@SpringBootApplication
@EnableConfigurationProperties(FangyuProperties.class)
public class FangyuApplication {

    public static void main(String[] args) {
        ensureStorageDirectories();
        ConfigurableApplicationContext context = new SpringApplicationBuilder(FangyuApplication.class)
            .web(WebApplicationType.NONE)
            .headless(false)
            .run(args);

        context.getBean(DesktopRuntime.class).run(args);
    }

    @Bean(destroyMethod = "close")
    ExecutorService virtualTaskExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    private static void ensureStorageDirectories() {
        String configuredPath = System.getenv("FANGYU_DB_PATH");
        Path databasePath = configuredPath == null || configuredPath.isBlank()
            ? Path.of(System.getProperty("user.home"), ".fangyu-code", "fangyu-code.db")
            : Path.of(configuredPath);
        try {
            Files.createDirectories(databasePath.toAbsolutePath().getParent());
            Files.createDirectories(Path.of("logs"));
            Files.createDirectories(Path.of("exports"));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to prepare local storage directories", exception);
        }
    }
}
