package com.jarlink.debugger.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.jarlink.debugger.model.Project;
import com.jarlink.debugger.model.Scenario;
import com.jarlink.debugger.model.BuildHistoryRecord;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

@Service
public class DatabaseService {

    private final ObjectMapper objectMapper;
    private final File dbFile;

    public DatabaseService() {
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
                .enable(SerializationFeature.INDENT_OUTPUT);
        
        // Match the same database file project_db.json at roots CWD
        this.dbFile = Paths.get(System.getProperty("user.dir"), "../../project_db.json").toFile();
    }

    @Data
    public static class DatabaseRoot {
        private List<Project> projects = new ArrayList<>();
        private List<Scenario> scenarios = new ArrayList<>();
        private List<BuildHistoryRecord> history = new ArrayList<>();
    }

    public synchronized DatabaseRoot load() {
        try {
            // Traverse up folder hierarchy if inside packages/backend-java nested levels
            File resolved = dbFile;
            if (!resolved.exists()) {
                resolved = new File("project_db.json");
            }
            if (!resolved.exists()) {
                resolved = new File("../../project_db.json");
            }
            if (!resolved.exists()) {
                resolved = new File("../../../project_db.json");
            }

            if (resolved.exists()) {
                return objectMapper.readValue(resolved, DatabaseRoot.class);
            }
        } catch (IOException e) {
            System.err.println("Failed reading JSON project_db: " + e.getMessage());
        }
        return new DatabaseRoot();
    }

    public synchronized void save(DatabaseRoot root) {
        try {
            File resolved = dbFile;
            if (!resolved.exists()) {
                File current = new File("project_db.json");
                if (current.exists()) {
                    resolved = current;
                } else {
                    File parent = new File("../../project_db.json");
                    if (parent.exists() || parent.getParentFile() != null) {
                        resolved = parent;
                    }
                }
            }
            objectMapper.writeValue(resolved, root);
        } catch (IOException e) {
            System.err.println("Failed writing back JSON project_db updates: " + e.getMessage());
        }
    }
}
