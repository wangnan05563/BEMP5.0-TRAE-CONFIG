package com.hundsun.bemp.test;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.adapter.msg.xml.XmlDocument;
import com.hundsun.bemp.adapter.msg.xml.XmlNode;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.ClassPathResource;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.GenericMessage;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.util.StreamUtils;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * BEMP 银行适配器 MessageConverter 测试基类
 *
 * <p>封装通用的测试基础设施，让具体测试类只关注"业务断言"。
 * <p>所有银行适配器的 *Test.java 必须继承本类（或其子类）。
 *
 * <h2>使用约束</h2>
 * <ul>
 *   <li>必须使用 {@code @SpringBootTest} 启动真实 Spring 上下文（不要 mock 容器）</li>
 *   <li>必须使用 {@code @ActiveProfiles("test")} 加载 application-test.yml</li>
 *   <li>必须放在被测类的同包（即 src/test/java 镜像 src/main/java 的包路径）</li>
 * </ul>
 *
 * <h2>可继承的测试方法</h2>
 * <ul>
 *   <li>{@link #loadMockMessage(String)} — 从 classpath 加载 mock 报文</li>
 *   <li>{@link #buildXmlMessage(String)} — 用 XML 字符串构造 Spring Message</li>
 *   <li>{@link #buildJsonMessage(JSONObject)} — 用 JSONObject 构造 Spring Message</li>
 *   <li>{@link #assertConverterBeanExists(String)} — 验证 Spring 容器中存在指定 bean</li>
 * </ul>
 *
 * @author bemp-adapter-dev skill
 * @since 2026-06
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class AbstractAdapterConverterTest {

    @Autowired
    protected ApplicationContext applicationContext;

    /**
     * 约定: 所有 mock 报文存放于 src/test/resources/mock-msg/&lt;converter-name&gt;/
     * 命名: &lt;bank&gt;_&lt;channel&gt;_&lt;func-code&gt;_&lt;biz-code&gt;_&lt;request|response&gt;.{xml|json}
     * 例: sanxbank_ebank_PICE070101_newBill_request.json
     * 例: sanxbank_credit_POPC030102_occupyLimit_request.json
     * 例: sanxbank_cfca_POSH020101_signedDetached_request.json
     */
    protected static final String MOCK_MSG_DIR = "mock-msg/";

    @BeforeEach
    public void baseSetUp() {
        // 1. 验证 Spring 容器启动成功
        assertNotNull(applicationContext, "Spring 上下文未启动");

        // 2. 验证测试资源目录存在（避免 mock-msg 缺失导致测试假绿）
        assertNotNull(
            getClass().getClassLoader().getResource(MOCK_MSG_DIR),
            "mock-msg 资源目录不存在: " + MOCK_MSG_DIR
        );
    }

    // ==================== Mock 报文加载 ====================

    /**
     * 加载 mock 报文文本
     *
     * @param relativePath 相对路径，如 "sanxbank_ebank_PICE070101_newBill_request.json"
     * @return 报文文本（UTF-8）
     * @throws RuntimeException 文件不存在时
     */
    protected String loadMockMessage(String relativePath) {
        String fullPath = MOCK_MSG_DIR + relativePath;
        try (InputStream is = new ClassPathResource(fullPath).getInputStream()) {
            return StreamUtils.copyToString(is, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // 资源缺失应让测试 fail，而不是 silently 通过
            fail("加载 mock 报文失败: " + fullPath + ", 原因: " + e.getMessage());
            return null;
        }
    }

    /**
     * 加载 XML mock 报文并解析为 XmlDocument
     *
     * @param relativePath 相对路径
     * @return 解析后的 XmlDocument
     */
    protected XmlDocument loadMockXmlDocument(String relativePath) {
        String xml = loadMockMessage(relativePath);
        return XmlDocument.parse(xml);
    }

    /**
     * 加载 JSON mock 报文并解析为 JSONObject
     *
     * @param relativePath 相对路径
     * @return 解析后的 JSONObject
     */
    protected JSONObject loadMockJsonObject(String relativePath) {
        String json = loadMockMessage(relativePath);
        return JSON.parseObject(json);
    }

    // ==================== Spring Message 构造 ====================

    /**
     * 用 XML 字符串构造 Spring Message
     *
     * <p>适用场景: 模拟外围发送的 XML/SOAP 报文
     *
     * @param xmlContent 报文内容
     * @return Spring Message
     */
    protected Message<?> buildXmlMessage(String xmlContent) {
        // 实际项目使用 XmlDocument 作为 payload（与基类约定一致）
        XmlDocument doc = XmlDocument.parse(xmlContent);
        Map<String, Object> headers = new HashMap<>();
        headers.put("contentType", "text/xml");
        return new GenericMessage<>(doc, headers);
    }

    /**
     * 用 JSON 字符串构造 Spring Message
     *
     * @param jsonContent 报文内容
     * @return Spring Message
     */
    protected Message<?> buildJsonMessage(String jsonContent) {
        JSONObject payload = JSON.parseObject(jsonContent);
        Map<String, Object> headers = new HashMap<>();
        headers.put("contentType", "application/json");
        return new GenericMessage<>(payload, headers);
    }

    /**
     * 用 JSONObject 构造 Spring Message
     *
     * @param payload 业务载荷
     * @return Spring Message
     */
    protected Message<?> buildJsonMessage(JSONObject payload) {
        Map<String, Object> headers = new HashMap<>();
        headers.put("contentType", "application/json");
        return new GenericMessage<>(payload, headers);
    }

    /**
     * 构造带定长头的 TCP 报文 Message
     *
     * <p>适用场景: 短信平台等 TCP + 定长头协议
     *
     * @param fullPayload 完整报文（定长头 + XML/JSON 正文）
     * @return Spring Message
     */
    protected Message<?> buildTcpMessage(String fullPayload) {
        Map<String, Object> headers = new HashMap<>();
        headers.put("contentType", "application/octet-stream");
        return new GenericMessage<>(fullPayload, headers);
    }

    // ==================== Spring 容器断言 ====================

    /**
     * 验证 Spring 容器中存在指定 bean（用于验证 @Component 注解生效）
     *
     * @param beanName bean 名（如 "PICE070101MessageConverter"）
     */
    protected void assertConverterBeanExists(String beanName) {
        assertTrue(
            applicationContext.containsBean(beanName),
            "Spring 容器中不存在 bean: " + beanName + "，请检查 @Component 注解和包扫描路径"
        );
    }

    /**
     * 验证 Spring 容器中存在指定 bean
     *
     * @param beanName bean 名
     * @param beanType bean 类型
     */
    protected <T> T assertConverterBeanExists(String beanName, Class<T> beanType) {
        assertTrue(applicationContext.containsBean(beanName), "Spring 容器中不存在 bean: " + beanName);
        T bean = applicationContext.getBean(beanName, beanType);
        assertNotNull(bean, "bean 注入失败: " + beanName);
        return bean;
    }

    // ==================== 字段映射断言工具 ====================

    /**
     * 验证 requestDto 字段映射正确性
     *
     * <p>使用示例: assertRequestDtoField(result, "mrgdCustNo", "CN12345", "外围 suspectCustNo → 内部 mrgdCustNo")
     *
     * @param result    fromMessage 返回的 JSONObject
     * @param fieldPath 字段路径，支持嵌套（如 "requestDto.billInfo.billId"）
     * @param expected  期望值
     * @param desc      字段描述（用于失败信息）
     */
    protected void assertRequestDtoField(JSONObject result, String fieldPath, Object expected, String desc) {
        Object actual = getNestedValue(result, fieldPath);
        assertEquals(expected, actual, "字段映射错误 [" + desc + "], path=" + fieldPath);
    }

    /**
     * 提取嵌套字段值
     *
     * <p>为什么需要: 内部 DTO 经常嵌套（如 requestDto.billInfo.billId）
     */
    private Object getNestedValue(JSONObject json, String path) {
        String[] parts = path.split("\\.");
        Object current = json;
        for (String part : parts) {
            if (!(current instanceof JSONObject)) {
                return null;
            }
            current = ((JSONObject) current).get(part);
        }
        return current;
    }

    // ==================== 异常断言 ====================

    /**
     * 验证抛出了指定类型的异常
     *
     * <p>为什么需要: 报文非法/字段缺失场景下，Converter 应抛出明确的业务异常，便于上游定位
     */
    protected <T extends Throwable> T assertThrowsExactly(
        Class<T> expectedType,
        org.junit.jupiter.api.function.Executable executable
    ) {
        return assertThrows(expectedType, executable);
    }
}
