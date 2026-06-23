package sgbd.dbest.api.dto;

/**
 * Request body for POST /api/tables/dat
 * Imports a BTree table from a .dat file path.
 * The corresponding .head file must exist in the same directory.
 */
public class ImportDatRequest {
    /** Absolute path to the .dat file (e.g. C:\data\students.dat) */
    public String datFilePath;
}
