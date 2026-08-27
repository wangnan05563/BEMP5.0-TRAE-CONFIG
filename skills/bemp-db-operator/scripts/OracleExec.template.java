import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.Base64;
import java.util.Properties;

public class OracleExec {
    public static void main(String[] args) {
        String user = "__USER__";
        String pass = "__PASS__";
        String url  = "jdbc:oracle:thin:@__HOST__:__PORT__:__SERVICE__";
        String schema = "__SCHEMA__";
        String sqlB64 = "__SQLB64__";
        boolean testOnly = __TESTONLY__;
        try {
            Class.forName("oracle.jdbc.OracleDriver");
            Properties props = new Properties();
            props.setProperty("user", user);
            props.setProperty("password", pass);
            props.setProperty("oracle.jdbc.defaultNio", "false");
            props.setProperty("oracle.net.CONNECT_TIMEOUT", "60000");
            props.setProperty("oracle.jdbc.ReadTimeout", "60000");
            DriverManager.setLoginTimeout(60);
            Connection conn = DriverManager.getConnection(url, props);
            if (schema != null && !schema.isEmpty()) {
                Statement st0 = conn.createStatement();
                st0.execute("ALTER SESSION SET CURRENT_SCHEMA = " + schema);
                st0.close();
            }
            if (testOnly) {
                DatabaseMetaData meta = conn.getMetaData();
                System.out.println("SUCCESS connect ok DB=" + meta.getDatabaseProductVersion() + " Driver=" + meta.getDriverVersion());
                conn.close();
                return;
            }
            String sqlText = new String(Base64.getDecoder().decode(sqlB64), StandardCharsets.UTF_8);
            String[] stmts = sqlText.split(";");
            int success = 0, fail = 0;
            for (String s : stmts) {
                String t = s.trim();
                if (t.isEmpty()) { continue; }
                if (t.startsWith("--") || t.startsWith("/*") || t.startsWith("REM")) { continue; }
                try {
                    Statement st = conn.createStatement();
                    if (t.regionMatches(true, 0, "select", 0, 6)) {
                        ResultSet rs = st.executeQuery(t);
                        ResultSetMetaData rsm = rs.getMetaData();
                        int cols = rsm.getColumnCount();
                        StringBuilder hdr = new StringBuilder();
                        for (int i = 1; i <= cols; i++) { if (i > 1) hdr.append(" | "); hdr.append(rsm.getColumnLabel(i)); }
                        System.out.println("[ROWS] " + t.substring(0, Math.min(60, t.length())));
                        System.out.println(hdr);
                        int n = 0;
                        while (rs.next() && n < 200) {
                            StringBuilder line = new StringBuilder();
                            for (int i = 1; i <= cols; i++) { if (i > 1) line.append(" | "); line.append(rs.getString(i)); }
                            System.out.println(line);
                            n++;
                        }
                        System.out.println("  total=" + n + "+");
                        rs.close();
                    } else {
                        st.execute(t);
                    }
                    st.close();
                    success++;
                } catch (SQLException e) {
                    fail++;
                    System.out.println("[FAIL] " + e.getMessage());
                    System.out.println("  SQL: " + (t.length() > 120 ? t.substring(0, 120) + "..." : t));
                }
            }
            System.out.println("DONE success[" + success + "] fail[" + fail + "]");
            conn.close();
        } catch (ClassNotFoundException e) {
            System.out.println("ERROR driver-not-found: " + e.getMessage());
        } catch (SQLException e) {
            System.out.println("ERROR: " + e.getMessage());
            System.out.println("  ErrorCode=" + e.getErrorCode() + " SQLState=" + e.getSQLState());
            Throwable c = e.getCause();
            int lv = 0;
            while (c != null) { System.out.println("  Cause[" + lv + "]: " + c.getMessage()); c = c.getCause(); lv++; }
        }
    }
}