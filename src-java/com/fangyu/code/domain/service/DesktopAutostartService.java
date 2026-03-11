package com.fangyu.code.domain.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.fangyu.code.config.FangyuProperties;

@Service
public class DesktopAutostartService {

    private final FangyuProperties properties;

    public DesktopAutostartService(FangyuProperties properties) {
        this.properties = properties;
    }

    public void apply(boolean enabled) {
        switch (platform()) {
            case WINDOWS -> applyWindows(enabled);
            case MACOS -> applyMac(enabled);
            case LINUX -> applyLinux(enabled);
            case UNKNOWN -> {
            }
        }
    }

    public boolean isEnabled() {
        return switch (platform()) {
            case WINDOWS -> queryWindows();
            case MACOS -> Files.exists(macAgentPath());
            case LINUX -> Files.exists(linuxDesktopPath());
            case UNKNOWN -> false;
        };
    }

    private void applyWindows(boolean enabled) {
        String command = currentLaunchCommand();
        ProcessBuilder processBuilder = enabled
            ? new ProcessBuilder("reg", "add",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "/v", "FangyuCode",
                "/t", "REG_SZ",
                "/d", command,
                "/f")
            : new ProcessBuilder("reg", "delete",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "/v", "FangyuCode",
                "/f");
        run(processBuilder);
    }

    private boolean queryWindows() {
        try {
            Process process = new ProcessBuilder(
                "reg", "query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "FangyuCode")
                .start();
            return process.waitFor() == 0;
        } catch (Exception exception) {
            return false;
        }
    }

    private void applyMac(boolean enabled) {
        Path launchAgent = macAgentPath();
        try {
            Files.createDirectories(launchAgent.getParent());
            if (!enabled) {
                Files.deleteIfExists(launchAgent);
                return;
            }
            String plist = """
                <?xml version="1.0" encoding="UTF-8"?>
                <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
                <plist version="1.0">
                  <dict>
                    <key>Label</key>
                    <string>%s</string>
                    <key>ProgramArguments</key>
                    <array>
                      <string>/bin/sh</string>
                      <string>-lc</string>
                      <string>%s</string>
                    </array>
                    <key>RunAtLoad</key>
                    <true/>
                  </dict>
                </plist>
                """.formatted(properties.getDesktop().getIdentifier(), escapeXml(currentLaunchCommand()));
            Files.writeString(launchAgent, plist);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to update macOS autostart", exception);
        }
    }

    private void applyLinux(boolean enabled) {
        Path desktopFile = linuxDesktopPath();
        try {
            Files.createDirectories(desktopFile.getParent());
            if (!enabled) {
                Files.deleteIfExists(desktopFile);
                return;
            }
            String content = """
                [Desktop Entry]
                Type=Application
                Version=1.0
                Name=Fangyu Code
                Exec=/bin/sh -lc '%s'
                X-GNOME-Autostart-enabled=true
                """.formatted(currentLaunchCommand().replace("'", "'\"'\"'"));
            Files.writeString(desktopFile, content);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to update Linux autostart", exception);
        }
    }

    private String currentLaunchCommand() {
        String commandLine = ProcessHandle.current().info().commandLine().orElse("");
        if (commandLine.isBlank()) {
            return "java -jar fangyu-code.jar";
        }
        return commandLine.replace("--dev", "").trim();
    }

    private void run(ProcessBuilder processBuilder) {
        try {
            Process process = processBuilder.start();
            if (process.waitFor() != 0) {
                throw new IllegalStateException(new String(process.getErrorStream().readAllBytes()));
            }
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to update Windows autostart", exception);
        }
    }

    private Path macAgentPath() {
        return Path.of(System.getProperty("user.home"), "Library", "LaunchAgents", properties.getDesktop().getIdentifier() + ".plist");
    }

    private Path linuxDesktopPath() {
        return Path.of(System.getProperty("user.home"), ".config", "autostart", "fangyu-code.desktop");
    }

    private Platform platform() {
        String osName = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        if (osName.contains("win")) {
            return Platform.WINDOWS;
        }
        if (osName.contains("mac")) {
            return Platform.MACOS;
        }
        if (osName.contains("nux") || osName.contains("linux")) {
            return Platform.LINUX;
        }
        return Platform.UNKNOWN;
    }

    private String escapeXml(String value) {
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;");
    }

    private enum Platform {
        WINDOWS,
        MACOS,
        LINUX,
        UNKNOWN
    }
}
