import java.sql.*;
import java.util.Properties;

/**
 * 使用Oracle JDBC Thin驱动执行SQL脚本
 * 解决sqlplus 11.2客户端无法连接新版Oracle服务器(Oracle 19c)的问题
 */
public class OracleExecutor {
    public static void main(String[] args) {
        String jdbcUrl = "jdbc:oracle:thin:@10.20.42.211:1521:orcl";
        String schema = "BEMP_HNNX";

        Connection conn = null;
        Statement stmt = null;

        try {
            // 1. 加载驱动
            Class.forName("oracle.jdbc.OracleDriver");
            System.out.println("[INFO] 加载Oracle JDBC驱动成功");

            // 2. 建立连接（使用Properties方式，兼容Oracle 19c）
            Properties props = new Properties();
            props.setProperty("user", "bemp_hnnx");
            props.setProperty("password", "123456");
            props.setProperty("oracle.net.CONNECT_TIMEOUT", "60000");
            DriverManager.setLoginTimeout(60);
            conn = DriverManager.getConnection(jdbcUrl, props);
            conn.setAutoCommit(true);
            System.out.println("[INFO] 连接数据库成功: " + jdbcUrl);

            // 3. 设置schema
            stmt = conn.createStatement();
            stmt.execute("ALTER SESSION SET CURRENT_SCHEMA = " + schema);
            System.out.println("[INFO] 切换Schema: " + schema);

            // 4. 查询当前branch_admin_init_pwd参数状态
            System.out.println("\n=== 查询当前 branch_admin_init_pwd 参数状态 ===");
            ResultSet rs = stmt.executeQuery(
                "SELECT ID, LEGAL_NO, PARAM_KEY, PARAM_NAME, PARAM_VALUE, PARAM_TYPE, OPERATOR, " +
                "CREATE_TIME, UPDATE_TIME " +
                "FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY = 'branch_admin_init_pwd'"
            );
            boolean exists = false;
            while (rs.next()) {
                exists = true;
                System.out.println("  ID: " + rs.getLong("ID"));
                System.out.println("  LEGAL_NO: " + rs.getString("LEGAL_NO"));
                System.out.println("  PARAM_KEY: " + rs.getString("PARAM_KEY"));
                System.out.println("  PARAM_NAME: " + rs.getString("PARAM_NAME"));
                System.out.println("  PARAM_VALUE: " + rs.getString("PARAM_VALUE"));
                System.out.println("  PARAM_TYPE: " + rs.getString("PARAM_TYPE"));
                System.out.println("  OPERATOR: " + rs.getString("OPERATOR"));
                System.out.println("  CREATE_TIME: " + rs.getLong("CREATE_TIME"));
                System.out.println("  UPDATE_TIME: " + rs.getLong("UPDATE_TIME"));
            }
            if (!exists) {
                System.out.println("  (记录不存在)");
            }
            rs.close();

            // 5. 执行MERGE插入/更新
            System.out.println("\n=== 执行MERGE插入/更新 branch_admin_init_pwd 参数 ===");
            // 注：根据已有数据，PARAM_TYPE 列定义为 VARCHAR2(1)，只能存单字符
            // 已有记录 PARAM_TYPE='1'，所以使用 '1' 而非 'text'
            String mergeSql = 
                "MERGE INTO TM_BUSINESS_PARAMETER t " +
                "USING (SELECT '100001' AS legal_no FROM DUAL) src " +
                "ON (t.LEGAL_NO = src.legal_no AND t.PARAM_KEY = 'branch_admin_init_pwd') " +
                "WHEN MATCHED THEN " +
                "  UPDATE SET " +
                "    PARAM_VALUE = '888888', " +
                "    PARAM_NAME  = '机构管理员初始密码', " +
                "    UPDATE_TIME = (SELECT TO_NUMBER(TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS')) FROM DUAL), " +
                "    OPERATOR    = 'SYS' " +
                "WHEN NOT MATCHED THEN " +
                "  INSERT (ID, LEGAL_NO, PARAM_TITLE, PARAM_KEY, PARAM_NAME, PARAM_VALUE, PARAM_TYPE, PARAM_REMARK, " +
                "          PARAM_GROUP_CODE, OPERATOR, CREATE_TIME, UPDATE_TIME, IS_ROW_SHOW, BUSI_TYPE) " +
                "  VALUES ((SELECT NVL(MAX(ID), 0) + 1 FROM TM_BUSINESS_PARAMETER), " +
                "          '100001', " +
                "          '机构管理员', " +
                "          'branch_admin_init_pwd', " +
                "          '机构管理员初始密码', " +
                "          '888888', " +
                "          '1', " +
                "          '批量导入机构管理员时的初始登录密码，默认值888888', " +
                "          'BRANCH_ADMIN', " +
                "          'SYS', " +
                "          (SELECT TO_NUMBER(TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS')) FROM DUAL), " +
                "          (SELECT TO_NUMBER(TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS')) FROM DUAL), " +
                "          '0', " +
                "          'sm')";

            int rows = stmt.executeUpdate(mergeSql);
            System.out.println("  MERGE影响行数: " + rows);
            System.out.println("  COMMIT已自动提交");

            // 6. 验证结果
            System.out.println("\n=== 验证 branch_admin_init_pwd 参数已成功插入/更新 ===");
            rs = stmt.executeQuery(
                "SELECT ID, LEGAL_NO, PARAM_KEY, PARAM_NAME, PARAM_VALUE, PARAM_TYPE, PARAM_REMARK, " +
                "PARAM_GROUP_CODE, OPERATOR, IS_ROW_SHOW, BUSI_TYPE, " +
                "CREATE_TIME, UPDATE_TIME " +
                "FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY = 'branch_admin_init_pwd'"
            );
            boolean verified = false;
            while (rs.next()) {
                verified = true;
                System.out.println("  ID: " + rs.getLong("ID"));
                System.out.println("  LEGAL_NO: " + rs.getString("LEGAL_NO"));
                System.out.println("  PARAM_KEY: " + rs.getString("PARAM_KEY"));
                System.out.println("  PARAM_NAME: " + rs.getString("PARAM_NAME"));
                System.out.println("  PARAM_VALUE: " + rs.getString("PARAM_VALUE"));
                System.out.println("  PARAM_TYPE: " + rs.getString("PARAM_TYPE"));
                System.out.println("  PARAM_REMARK: " + rs.getString("PARAM_REMARK"));
                System.out.println("  PARAM_GROUP_CODE: " + rs.getString("PARAM_GROUP_CODE"));
                System.out.println("  OPERATOR: " + rs.getString("OPERATOR"));
                System.out.println("  IS_ROW_SHOW: " + rs.getString("IS_ROW_SHOW"));
                System.out.println("  BUSI_TYPE: " + rs.getString("BUSI_TYPE"));
                System.out.println("  CREATE_TIME: " + rs.getLong("CREATE_TIME"));
                System.out.println("  UPDATE_TIME: " + rs.getLong("UPDATE_TIME"));
            }
            if (!verified) {
                System.out.println("  [ERROR] 验证失败：记录未找到！");
                System.exit(1);
            }
            rs.close();

            System.out.println("\n[SUCCESS] branch_admin_init_pwd 参数已成功插入/更新，值: 888888");

        } catch (ClassNotFoundException e) {
            System.err.println("[ERROR] 找不到Oracle JDBC驱动: " + e.getMessage());
            System.exit(1);
        } catch (SQLException e) {
            System.err.println("[ERROR] 数据库操作失败: " + e.getMessage());
            System.err.println("  ErrorCode: " + e.getErrorCode());
            System.err.println("  SQLState: " + e.getSQLState());
            System.exit(1);
        } finally {
            try { if (stmt != null) stmt.close(); } catch (SQLException e) {}
            try { if (conn != null) conn.close(); } catch (SQLException e) {}
        }
    }
}