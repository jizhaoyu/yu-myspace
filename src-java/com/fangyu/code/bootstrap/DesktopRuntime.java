package com.fangyu.code.bootstrap;

import org.springframework.stereotype.Component;

import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.desktop.DesktopEventPublisher;
import com.fangyu.code.desktop.PromptCommand;

import build.krema.core.Krema;

@Component
public class DesktopRuntime {

    private final FangyuProperties properties;
    private final DesktopEventPublisher eventPublisher;
    private final PromptCommand promptCommand;

    public DesktopRuntime(
        FangyuProperties properties,
        DesktopEventPublisher eventPublisher,
        PromptCommand promptCommand
    ) {
        this.properties = properties;
        this.eventPublisher = eventPublisher;
        this.promptCommand = promptCommand;
    }

    public void run(String[] args) {
        boolean devMode = isDevMode(args);

        Krema app = Krema.app()
            .title(properties.getDesktop().getTitle())
            .identifier(properties.getDesktop().getIdentifier())
            .version(properties.getDesktop().getVersion())
            .size(1440, 960)
            .minSize(1120, 720)
            .debug(devMode)
            .events(eventPublisher::bind)
            .commands(promptCommand);

        if (devMode) {
            app.devUrl(properties.getDesktop().getDevUrl());
        } else {
            app.prodAssets(properties.getDesktop().getProdAssets());
        }

        app.run();
    }

    private boolean isDevMode(String[] args) {
        for (String arg : args) {
            if ("--dev".equals(arg) || "-d".equals(arg)) {
                return true;
            }
        }
        String env = System.getenv("KREMA_DEV");
        return "true".equalsIgnoreCase(env) || "1".equals(env);
    }
}
