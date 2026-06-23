package sgbd.dbest.api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import sgbd.dbest.api.dto.*;
import sgbd.dbest.api.service.TableService;

import java.io.File;
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
}
