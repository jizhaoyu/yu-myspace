package com.fangyu.code.config;

import com.fangyu.code.domain.model.AiEngineKind;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "fangyu")
@Validated
public class FangyuProperties {

    private Desktop desktop = new Desktop();
    private Queue queue = new Queue();
    private Context context = new Context();
    private Budgets budgets = new Budgets();
    private Engines engines = new Engines();
    private Sessions sessions = new Sessions();
    private Mcp mcp = new Mcp();

    public Desktop getDesktop() {
        return desktop;
    }

    public void setDesktop(Desktop desktop) {
        this.desktop = desktop;
    }

    public Queue getQueue() {
        return queue;
    }

    public void setQueue(Queue queue) {
        this.queue = queue;
    }

    public Context getContext() {
        return context;
    }

    public void setContext(Context context) {
        this.context = context;
    }

    public Budgets getBudgets() {
        return budgets;
    }

    public void setBudgets(Budgets budgets) {
        this.budgets = budgets;
    }

    public Engines getEngines() {
        return engines;
    }

    public void setEngines(Engines engines) {
        this.engines = engines;
    }

    public Sessions getSessions() {
        return sessions;
    }

    public void setSessions(Sessions sessions) {
        this.sessions = sessions;
    }

    public Mcp getMcp() {
        return mcp;
    }

    public void setMcp(Mcp mcp) {
        this.mcp = mcp;
    }

    public static class Desktop {
        @NotBlank
        private String title = "Fangyu Code";
        @NotBlank
        private String version = "0.1.0";
        @NotBlank
        private String identifier = "com.fangyu.code";
        @NotBlank
        private String devUrl = "http://localhost:5173";
        @NotBlank
        private String prodAssets = "/web";

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getVersion() {
            return version;
        }

        public void setVersion(String version) {
            this.version = version;
        }

        public String getIdentifier() {
            return identifier;
        }

        public void setIdentifier(String identifier) {
            this.identifier = identifier;
        }

        public String getDevUrl() {
            return devUrl;
        }

        public void setDevUrl(String devUrl) {
            this.devUrl = devUrl;
        }

        public String getProdAssets() {
            return prodAssets;
        }

        public void setProdAssets(String prodAssets) {
            this.prodAssets = prodAssets;
        }
    }

    public static class Queue {
        @Min(1)
        private int maxActiveTasks = 1;
        @Min(1)
        private int defaultPriority = 50;
        @Min(1)
        private int insertPriorityBonus = 500;
        @Min(10)
        private int maxWaitingTasks = 200;

        public int getMaxActiveTasks() {
            return maxActiveTasks;
        }

        public void setMaxActiveTasks(int maxActiveTasks) {
            this.maxActiveTasks = maxActiveTasks;
        }

        public int getDefaultPriority() {
            return defaultPriority;
        }

        public void setDefaultPriority(int defaultPriority) {
            this.defaultPriority = defaultPriority;
        }

        public int getInsertPriorityBonus() {
            return insertPriorityBonus;
        }

        public void setInsertPriorityBonus(int insertPriorityBonus) {
            this.insertPriorityBonus = insertPriorityBonus;
        }

        public int getMaxWaitingTasks() {
            return maxWaitingTasks;
        }

        public void setMaxWaitingTasks(int maxWaitingTasks) {
            this.maxWaitingTasks = maxWaitingTasks;
        }
    }

    public static class Context {
        @Min(512)
        private int targetTokens = 12_000;
        @Min(1024)
        private int hardLimitTokens = 24_000;
        @Min(128)
        private int summaryMaxCharacters = 1_200;

        public int getTargetTokens() {
            return targetTokens;
        }

        public void setTargetTokens(int targetTokens) {
            this.targetTokens = targetTokens;
        }

        public int getHardLimitTokens() {
            return hardLimitTokens;
        }

        public void setHardLimitTokens(int hardLimitTokens) {
            this.hardLimitTokens = hardLimitTokens;
        }

        public int getSummaryMaxCharacters() {
            return summaryMaxCharacters;
        }

        public void setSummaryMaxCharacters(int summaryMaxCharacters) {
            this.summaryMaxCharacters = summaryMaxCharacters;
        }
    }

    public static class Budgets {
        private double sessionUsd = 12.5d;
        private double weeklyUsd = 60d;

        public double getSessionUsd() {
            return sessionUsd;
        }

        public void setSessionUsd(double sessionUsd) {
            this.sessionUsd = sessionUsd;
        }

        public double getWeeklyUsd() {
            return weeklyUsd;
        }

        public void setWeeklyUsd(double weeklyUsd) {
            this.weeklyUsd = weeklyUsd;
        }
    }

    public static class Sessions {
        private String defaultTitle = "新会话";

        public String getDefaultTitle() {
            return defaultTitle;
        }

        public void setDefaultTitle(String defaultTitle) {
            this.defaultTitle = defaultTitle;
        }
    }

    public static class Mcp {
        private String registryPath = "";
        private String opencodeConfigPath = "";

        public String getRegistryPath() {
            return registryPath;
        }

        public void setRegistryPath(String registryPath) {
            this.registryPath = registryPath;
        }

        public String getOpencodeConfigPath() {
            return opencodeConfigPath;
        }

        public void setOpencodeConfigPath(String opencodeConfigPath) {
            this.opencodeConfigPath = opencodeConfigPath;
        }
    }

    public static class Engines {
        private AiEngineKind defaultEngine = AiEngineKind.OPENCODE;
        private CodexEngine codex = new CodexEngine();

        public AiEngineKind getDefaultEngine() {
            return defaultEngine;
        }

        public void setDefaultEngine(AiEngineKind defaultEngine) {
            this.defaultEngine = defaultEngine;
        }

        public CodexEngine getCodex() {
            return codex;
        }

        public void setCodex(CodexEngine codex) {
            this.codex = codex;
        }
    }

    public static class EngineCommon {
        private boolean enabled = true;
        @Min(5)
        private int timeoutSeconds = 900;
        private double inputCostPer1k = 0d;
        private double outputCostPer1k = 0d;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public int getTimeoutSeconds() {
            return timeoutSeconds;
        }

        public void setTimeoutSeconds(int timeoutSeconds) {
            this.timeoutSeconds = timeoutSeconds;
        }

        public double getInputCostPer1k() {
            return inputCostPer1k;
        }

        public void setInputCostPer1k(double inputCostPer1k) {
            this.inputCostPer1k = inputCostPer1k;
        }

        public double getOutputCostPer1k() {
            return outputCostPer1k;
        }

        public void setOutputCostPer1k(double outputCostPer1k) {
            this.outputCostPer1k = outputCostPer1k;
        }
    }

    public static class CliEngine extends EngineCommon {
        private String executable;
        private String workingDirectory = ".";

        public String getExecutable() {
            return executable;
        }

        public void setExecutable(String executable) {
            this.executable = executable;
        }

        public String getWorkingDirectory() {
            return workingDirectory;
        }

        public void setWorkingDirectory(String workingDirectory) {
            this.workingDirectory = workingDirectory;
        }
    }

    public static class CodexEngine extends EngineCommon {
        private String endpoint;
        private String model;
        private String apiKey;

        public String getEndpoint() {
            return endpoint;
        }

        public void setEndpoint(String endpoint) {
            this.endpoint = endpoint;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }
    }
}
