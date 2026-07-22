package sgbd.dbest.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

@SpringBootApplication
public class DBestApiApplication {

    @Value("${server.port:8080}")
    private int port;

    /** Set -Ddbest.open-browser=false to disable auto-opening the browser. */
    @Value("${dbest.open-browser:true}")
    private boolean openBrowser;

    public static void main(String[] args) {
        SpringApplication.run(DBestApiApplication.class, args);
    }

    /**
     * When the single bundled jar is run, the UI is served at http://localhost:{port}.
     * Open it in the default browser automatically so running the tool is a
     * one-step "java -jar" — no need to remember the URL. Best-effort: if it fails
     * (e.g. a headless server), we just print the URL and carry on.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        String url = "http://localhost:" + port;
        System.out.println("\n  DBest is running — open " + url + " in your browser.\n");
        if (!openBrowser) return;
        try {
            String os = System.getProperty("os.name", "").toLowerCase();
            String[] cmd;
            if (os.contains("win")) {
                cmd = new String[] {"rundll32", "url.dll,FileProtocolHandler", url};
            } else if (os.contains("mac")) {
                cmd = new String[] {"open", url};
            } else {
                cmd = new String[] {"xdg-open", url};
            }
            new ProcessBuilder(cmd).start();
        } catch (Exception ignored) {
            // The URL was printed above; the user can open it manually.
        }
    }
}
