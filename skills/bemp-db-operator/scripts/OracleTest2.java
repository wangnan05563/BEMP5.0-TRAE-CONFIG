import java.sql.*;
import java.util.Properties;

public class OracleTest2 {
    public static void main(String[] args) {
        try {
            Class.forName("oracle.jdbc.OracleDriver");
            System.out.println("INFO: 驱动加载成功");

            Properties props = new Properties();
            props.setProperty("user", "bemp_hnnx");
            props.setProperty("password", "123456");
            // 延长连接超时，避免被服务器过早关闭
            props.setProperty("oracle.net.CONNECT_TIMEOUT", "60000");
            props.setProperty("oracle.jdbc.ReadTimeout", "60000");
            // 尝试禁用NIO
            // props.setProperty("oracle.jdbc.defaultNio", "false");

            String url = "jdbc:oracle:thin:@10.20.42.211:1521:orcl";
            System.out.println("INFO: 尝试连接...");
            System.out.println("INFO: URL=" + url);

            DriverManager.setLoginTimeout(60);
            long start = System.currentTimeMillis();
            Connection conn = DriverManager.getConnection(url, props);
            long elapsed = System.currentTimeMillis() - start;
            System.out.println("SUCCESS: 连接成功! 耗时: " + elapsed + "ms");

            DatabaseMetaData meta = conn.getMetaData();
            System.out.println("  DB版本: " + meta.getDatabaseProductVersion());
            System.out.println("  驱动版本: " + meta.getDriverVersion());
            conn.close();
        } catch (ClassNotFoundException e) {
            System.out.println("ERROR: 驱动未找到: " + e.getMessage());
        } catch (SQLException e) {
            System.out.println("ERROR: " + e.getMessage());
            System.out.println("  ErrorCode: " + e.getErrorCode());
            System.out.println("  SQLState: " + e.getSQLState());
            System.out.println("  耗时: " + (System.currentTimeMillis() - Long.parseLong("0")) + "ms");
            // 打印完整异常链
            Throwable cause = e.getCause();
            int level = 0;
            while (cause != null) {
                System.out.println("  Cause[" + level + "]: " + cause.getClass().getName() + " - " + cause.getMessage());
                cause = cause.getCause();
                level++;
            }
        }
    }
}