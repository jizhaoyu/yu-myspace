package com.fangyu.code.domain.service;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import javax.swing.JFileChooser;
import javax.swing.UIManager;

import org.springframework.stereotype.Service;

@Service
public class DesktopFileDialogService {

    public String chooseWorkspaceDirectory() {
        AtomicReference<String> selected = new AtomicReference<>();
        runChooser(() -> {
            JFileChooser chooser = new JFileChooser();
            chooser.setDialogTitle("Select workspace folder");
            chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
            chooser.setMultiSelectionEnabled(false);
            if (chooser.showOpenDialog(null) == JFileChooser.APPROVE_OPTION && chooser.getSelectedFile() != null) {
                selected.set(chooser.getSelectedFile().getAbsolutePath());
            }
        });
        return selected.get();
    }

    public List<String> chooseContextFiles() {
        AtomicReference<List<String>> selected = new AtomicReference<>(List.of());
        runChooser(() -> {
            JFileChooser chooser = new JFileChooser();
            chooser.setDialogTitle("Attach context files");
            chooser.setFileSelectionMode(JFileChooser.FILES_ONLY);
            chooser.setMultiSelectionEnabled(true);
            if (chooser.showOpenDialog(null) != JFileChooser.APPROVE_OPTION) {
                return;
            }

            File[] files = chooser.getSelectedFiles();
            List<String> paths = new ArrayList<>();
            if (files != null) {
                for (File file : files) {
                    if (file != null) {
                        paths.add(file.getAbsolutePath());
                    }
                }
            }
            selected.set(paths);
        });
        return selected.get();
    }

    private void runChooser(Runnable action) {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {
        }

        try {
            action.run();
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to open desktop file chooser", exception);
        }
    }
}
