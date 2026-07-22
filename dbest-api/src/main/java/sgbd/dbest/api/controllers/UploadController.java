package sgbd.dbest.api.controllers;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import sgbd.dbest.api.dto.*;
import sgbd.dbest.api.service.TableService;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"})
public class UploadController {

    @Autowired
    private TableService tableService;

    private static final String UPLOAD_DIR = "uploads/";

    @PostMapping("/tables/upload")
    public ResponseEntity<?> uploadTableFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "tableName", required = false) String tableName,
            @RequestParam(value = "separator", required = false, defaultValue = ",") String separator,
            @RequestParam(value = "hasHeader", required = false, defaultValue = "true") boolean hasHeader) {
        
        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "File is empty"));
        }

        try {
            // Ensure uploads directory exists
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Save the file
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null) originalFilename = "uploaded_file";
            
            Path targetLocation = uploadPath.resolve(originalFilename);
            file.transferTo(targetLocation);

            String absolutePath = targetLocation.toAbsolutePath().toString();
            String lowerName = originalFilename.toLowerCase();

            // Route to appropriate import logic
            if (lowerName.endsWith(".dat")) {
                ImportDatRequest req = new ImportDatRequest();
                req.datFilePath = absolutePath;
                return ResponseEntity.ok(tableService.importDat(req));
            } else if (lowerName.endsWith(".head") || lowerName.endsWith(".fyi")) {
                ImportFYIRequest req = new ImportFYIRequest();
                req.filePath = absolutePath;
                req.tableName = tableName;
                return ResponseEntity.ok(tableService.importFYI(req));
            } else if (lowerName.endsWith(".csv")) {
                ImportCSVRequest req = new ImportCSVRequest();
                req.filePath = absolutePath;
                req.tableName = tableName;
                req.separator = separator != null && !separator.isEmpty() ? separator.charAt(0) : ',';
                req.beginRow = hasHeader ? 1 : 0;
                req.stringDelimiter = '"'; // Default delimiter
                return ResponseEntity.ok(tableService.importCSV(req));
            } else if (lowerName.endsWith(".xml")) {
                ImportXMLRequest req = new ImportXMLRequest();
                req.filePath = absolutePath;
                req.tableName = tableName;
                return ResponseEntity.ok(tableService.importXML(req));
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Unsupported file type. Must be .dat, .head, .fyi, .csv, or .xml"));
            }

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload and import: " + e.getMessage()));
        }
    }

    /**
     * Imports a BTree table from its two files together: the {@code .dat} (data)
     * and the {@code .head} (schema). A BTree table cannot be read from the
     * {@code .dat} alone — this is why importing a lone {@code .dat} used to fail
     * with a "Failed to fetch" for every file except the one whose {@code .head}
     * happened to already sit in the working directory.
     *
     * <p>Both files are saved side by side in {@code uploads/}. The {@code .head}
     * stores the data file location in {@code information.file-path}; that value
     * is rewritten to the absolute path of the {@code .dat} we just saved, so the
     * import works regardless of what path the {@code .head} was created with on
     * another machine.
     */
    @PostMapping("/tables/upload-btree")
    public ResponseEntity<?> uploadBTree(@RequestParam("files") MultipartFile[] files) {
        if (files == null || files.length == 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "No files sent."));
        }
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            File headFile = null;
            File datFile = null;
            for (MultipartFile f : files) {
                if (f.isEmpty()) continue;
                String name = f.getOriginalFilename();
                if (name == null) continue;
                Path target = uploadPath.resolve(name);
                f.transferTo(target.toAbsolutePath());
                String lower = name.toLowerCase();
                if (lower.endsWith(".head")) headFile = target.toFile();
                else if (lower.endsWith(".dat")) datFile = target.toFile();
            }

            if (headFile == null && datFile == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Send the .dat and its .head file — a BTree table needs both."));
            }

            // Preferred path: we have the .head. If we also have the .dat, point the
            // header at it so the data file always resolves.
            if (headFile != null) {
                if (datFile != null) {
                    repointHeaderToDataFile(headFile, datFile);
                }
                ImportFYIRequest req = new ImportFYIRequest();
                req.filePath = headFile.getAbsolutePath();
                return ResponseEntity.ok(tableService.importFYI(req));
            }

            // Only the .dat was sent — try the sibling-.head discovery path, which
            // will only work if a matching .head is already present.
            ImportDatRequest req = new ImportDatRequest();
            req.datFilePath = datFile.getAbsolutePath();
            try {
                return ResponseEntity.ok(tableService.importDat(req));
            } catch (Exception ex) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "This .dat has no .head — a BTree table needs both files. "
                                + "Select the .head as well and import them together."));
            }

        } catch (Exception e) {
            e.printStackTrace();
            String msg = e.getMessage() != null ? e.getMessage() : e.toString();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to import BTree table: " + msg));
        }
    }

    /** Rewrites {@code information.file-path} of a .head file to the absolute path of the given .dat. */
    private void repointHeaderToDataFile(File headFile, File datFile) throws Exception {
        Gson gson = new GsonBuilder().create();
        JsonObject root;
        try (FileReader reader = new FileReader(headFile)) {
            root = gson.fromJson(reader, JsonObject.class);
        }
        if (root != null && root.has("information") && root.getAsJsonObject("information") != null) {
            root.getAsJsonObject("information").addProperty("file-path", datFile.getAbsolutePath());
            try (FileWriter writer = new FileWriter(headFile)) {
                gson.toJson(root, writer);
            }
        }
    }
}
