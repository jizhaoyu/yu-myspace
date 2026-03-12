package com.fangyu.code.domain.service;

import java.awt.Desktop;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.SystemTray;
import java.awt.Toolkit;
import java.awt.TrayIcon;
import java.awt.datatransfer.DataFlavor;
import java.awt.datatransfer.StringSelection;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class DesktopNativeService {
    // Added methods for file/directory selection (Phase 4)

    /**
     * Opens a directory chooser dialog for the user to select a workspace directory.
     * Returns the absolute path of the selected directory, or null if cancelled.
     */
    public String chooseWorkspaceDirectory() {
        try {
            // Prefer AWT/Swing so we don't require JavaFX on the classpath.
            // This blocks until the user closes the dialog.
            javax.swing.JFileChooser chooser = new javax.swing.JFileChooser();
            chooser.setDialogTitle("Select Workspace Directory");
            chooser.setFileSelectionMode(javax.swing.JFileChooser.DIRECTORIES_ONLY);
            chooser.setMultiSelectionEnabled(false);

            int result = chooser.showOpenDialog(null);
            if (result != javax.swing.JFileChooser.APPROVE_OPTION) {
                return null;
            }

            java.io.File selected = chooser.getSelectedFile();
            return selected != null ? selected.getAbsolutePath() : null;
        } catch (Throwable t) {
            logger.warn("Directory chooser failed: {}", t.getMessage());
            return null;
        }
    }

    public java.util.List<String> chooseContextFiles() {
        try {
            javax.swing.JFileChooser chooser = new javax.swing.JFileChooser();
            chooser.setDialogTitle("Select Files");
            chooser.setFileSelectionMode(javax.swing.JFileChooser.FILES_ONLY);
            chooser.setMultiSelectionEnabled(true);

            int result = chooser.showOpenDialog(null);
            if (result != javax.swing.JFileChooser.APPROVE_OPTION) {
                return java.util.Collections.emptyList();
            }

            java.io.File[] files = chooser.getSelectedFiles();
            if (files == null || files.length == 0) {
                java.io.File single = chooser.getSelectedFile();
                if (single == null) {
                    return java.util.Collections.emptyList();
                }
                return java.util.List.of(single.getAbsolutePath());
            }

            java.util.List<String> paths = new java.util.ArrayList<>();
            for (java.io.File f : files) {
                if (f != null) {
                    paths.add(f.getAbsolutePath());
                }
            }
            return paths;
        } catch (Throwable t) {
            logger.warn("File chooser failed: {}", t.getMessage());
            return java.util.Collections.emptyList();
        }
    }

    // Existing methods follow...


    private static final Logger logger = LoggerFactory.getLogger(DesktopNativeService.class);
    private TrayIcon trayIcon;

    public void copyToClipboard(String text) {
        String value = text == null ? "" : text;
        try {
            Toolkit.getDefaultToolkit().getSystemClipboard().setContents(new StringSelection(value), null);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to copy content to clipboard", exception);
        }
    }

    public String readClipboardText() {
        try {
            Object value = Toolkit.getDefaultToolkit().getSystemClipboard().getData(DataFlavor.stringFlavor);
            return value == null ? "" : String.valueOf(value);
        } catch (Exception ignored) {
            return "";
        }
    }

    public String openPath(String path) {
        if (path == null || path.isBlank()) {
            throw new IllegalArgumentException("Path must not be blank");
        }
        Path target = Path.of(path.strip()).toAbsolutePath().normalize();
        if (!Files.exists(target)) {
            throw new IllegalArgumentException("Path does not exist: " + target);
        }
        try {
            Desktop.getDesktop().open(target.toFile());
            return target.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to open path", exception);
        }
    }

    public String openLogsDirectory() {
        Path logsPath = Path.of("logs").toAbsolutePath().normalize();
        try {
            Files.createDirectories(logsPath);
            Desktop.getDesktop().open(logsPath.toFile());
            return logsPath.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to open logs directory", exception);
        }
    }

    public void notifyUser(String title, String body) {
        String safeTitle = title == null || title.isBlank() ? "Fangyu Code" : title.strip();
        String safeBody = body == null ? "" : body.strip();
        try {
            TrayIcon icon = ensureTrayIcon();
            if (icon != null) {
                icon.displayMessage(safeTitle, safeBody, TrayIcon.MessageType.INFO);
                return;
            }
            Toolkit.getDefaultToolkit().beep();
            logger.info("Desktop notification fallback title={} body={}", safeTitle, safeBody);
        } catch (Exception exception) {
            logger.warn("Failed to send desktop notification: {}", exception.getMessage());
        }
    }

    private TrayIcon ensureTrayIcon() {
        if (!SystemTray.isSupported()) {
            return null;
        }
        if (trayIcon != null) {
            return trayIcon;
        }
        try {
            BufferedImage image = new BufferedImage(16, 16, BufferedImage.TYPE_INT_ARGB);
            Graphics2D graphics = image.createGraphics();
            graphics.fillRect(0, 0, 16, 16);
            graphics.dispose();

            Image scaled = image.getScaledInstance(16, 16, Image.SCALE_SMOOTH);
            TrayIcon icon = new TrayIcon(scaled, "Fangyu Code");
            icon.setImageAutoSize(true);
            SystemTray.getSystemTray().add(icon);
            this.trayIcon = icon;
            return icon;
        } catch (Exception exception) {
            logger.warn("Failed to initialize tray icon: {}", exception.getMessage());
            return null;
        }
    }
}
