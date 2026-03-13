package com.fangyu.code.bootstrap;

import org.springframework.stereotype.Component;

import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.desktop.DesktopEventPublisher;
import com.fangyu.code.desktop.PromptCommand;
import com.fangyu.code.domain.service.EngineConfigurationService;

import build.krema.core.Krema;

@Component
public class DesktopRuntime {

    private final FangyuProperties properties;
    private final KremaNativeBootstrap kremaNativeBootstrap;
    private final DesktopEventPublisher eventPublisher;
    private final PromptCommand promptCommand;
    private final EngineConfigurationService engineConfigurationService;

    public DesktopRuntime(
        FangyuProperties properties,
        KremaNativeBootstrap kremaNativeBootstrap,
        DesktopEventPublisher eventPublisher,
        PromptCommand promptCommand,
        EngineConfigurationService engineConfigurationService
    ) {
        this.properties = properties;
        this.kremaNativeBootstrap = kremaNativeBootstrap;
        this.eventPublisher = eventPublisher;
        this.promptCommand = promptCommand;
        this.engineConfigurationService = engineConfigurationService;
    }

    public void run(String[] args) {
        boolean devMode = isDevMode(args);
        printStartupDiagnostics(devMode);
        kremaNativeBootstrap.prepare();

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

    private void printStartupDiagnostics(boolean devMode) {
        String runtimeMode = devMode ? "dev" : "prod";
        String uiTarget = devMode ? properties.getDesktop().getDevUrl() : properties.getDesktop().getProdAssets();
        System.out.println("[fangyu] desktop-runtime mode=" + runtimeMode + " ui=" + uiTarget);
        engineConfigurationService.statuses().forEach(status -> System.out.println(
            "[fangyu] engine=" + status.engine() +
                " enabled=" + status.enabled() +
                " configured=" + status.configured() +
                " available=" + status.available() +
                " detail=\"" + status.detail() + "\""
        ));
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
