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
import org.springframework.data.jdbc.core.dialect.JdbcArrayColumns;
import org.springframework.data.jdbc.core.dialect.JdbcDialect;
import org.springframework.data.relational.core.dialect.AnsiDialect;
import org.springframework.scheduling.annotation.EnableScheduling;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fangyu.code.bootstrap.DesktopRuntime;
import com.fangyu.code.config.FangyuProperties;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(FangyuProperties.class)
public class FangyuApplication {

    public static void main(String[] args) {
        ensureStorageDirectories();
        boolean desktopEnabled = isDesktopEnabled(args);
        ConfigurableApplicationContext context = new SpringApplicationBuilder(FangyuApplication.class)
            .web(WebApplicationType.NONE)
            .headless(!desktopEnabled)
            .run(args);

        if (desktopEnabled) {
            context.getBean(DesktopRuntime.class).run(args);
        } else {
            System.out.println("[fangyu] desktop-runtime disabled; backend started without Krema window");
        }
    }

    @Bean(destroyMethod = "close")
    ExecutorService virtualTaskExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    @Bean
    JdbcDialect jdbcDialect() {
        return SqliteJdbcDialect.INSTANCE;
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

    private static boolean isDesktopEnabled(String[] args) {
        for (String arg : args) {
            if ("--fangyu.desktop.enabled=false".equalsIgnoreCase(arg)) {
                return false;
            }
            if ("--fangyu.desktop.enabled=true".equalsIgnoreCase(arg)) {
                return true;
            }
        }

        String systemProperty = System.getProperty("fangyu.desktop.enabled");
        if (systemProperty != null && !systemProperty.isBlank()) {
            return Boolean.parseBoolean(systemProperty);
        }

        String environmentValue = System.getenv("FANGYU_DESKTOP_ENABLED");
        if (environmentValue != null && !environmentValue.isBlank()) {
            return Boolean.parseBoolean(environmentValue);
        }

        return true;
    }

    private static final class SqliteJdbcDialect extends org.springframework.data.relational.core.dialect.AbstractDialect implements JdbcDialect {
        private static final SqliteJdbcDialect INSTANCE = new SqliteJdbcDialect();

        @Override
        public org.springframework.data.relational.core.dialect.LimitClause limit() {
            return AnsiDialect.INSTANCE.limit();
        }

        @Override
        public org.springframework.data.relational.core.dialect.LockClause lock() {
            return AnsiDialect.INSTANCE.lock();
        }

        @Override
        public JdbcArrayColumns getArraySupport() {
            return JdbcDialect.getArraySupport(AnsiDialect.INSTANCE);
        }

        @Override
        public org.springframework.data.relational.core.sql.IdentifierProcessing getIdentifierProcessing() {
            return AnsiDialect.INSTANCE.getIdentifierProcessing();
        }
    }
}
