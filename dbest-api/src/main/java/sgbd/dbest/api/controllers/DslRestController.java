package sgbd.dbest.api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sgbd.dbest.api.dto.ExecuteGraphRequest;
import sgbd.dbest.api.service.DslService;

import java.util.Map;

@RestController
@RequestMapping("/api/dsl")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"})
public class DslRestController {

    @Autowired
    private DslService dslService;

    public static class ParseRequest {
        public String dslText;
    }

    @PostMapping("/parse")
    public ResponseEntity<?> parse(@RequestBody ParseRequest req) {
        try {
            if (req.dslText == null || req.dslText.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "dslText cannot be empty"));
            }
            return ResponseEntity.ok(dslService.parse(req.dslText));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestBody ExecuteGraphRequest req) {
        try {
            String dslText = dslService.generate(req);
            return ResponseEntity.ok(Map.of("dslText", dslText));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }
}
