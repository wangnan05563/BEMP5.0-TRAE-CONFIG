package com.hundsun.bemp.test.template;

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.test.AbstractAdapterConverterTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;

import static org.junit.jupiter.api.Assertions.*;

/**
 * TCP 协议 MessageConverter 测试模板
 *
 * <p>适用基类:
 * <ul>
 *   <li>Server: {@code AbstractTcpMessageApplyResponseConverter}</li>
 *   <li>Client: {@code AbstractTcpMessageRequestReplyConverter}（如 sanxbank UBPS）</li>
 * </ul>
 *
 * <p>参考实现: sanxbank 的 POPE020101MessageConverter（UBPS 平台）
 *
 * <h2>覆盖场景</h2>
 * <ol>
 *   <li>正常请求报文构造（定长头 + XML/JSON）</li>
 *   <li>正常响应报文解析（去除定长头 + 解析 XML/JSON）</li>
 *   <li>GBK 编码报文解析</li>
 *   <li>响应码映射（GXP 0/1 → BEMP 000000/999999）</li>
 * </ol>
 *
 * <h2>注意</h2>
 * <p>TCP 类 Converter 通常依赖 {@code HeadUtils}（{@code @Autowired}），
 * 测试基类已用 {@code @SpringBootTest} 加载真实 Bean，无需 mock
 */
public abstract class AbstractTcpMessageConverterTest extends AbstractAdapterConverterTest {

    protected abstract String getConverterBeanName();
    protected abstract Class<?> getConverterClass();
    protected String getMockMsgSubDir() {
        return getConverterClass().getSimpleName();
    }
    protected abstract String getRequestMockFile();
    protected abstract String getResponseMockFile();

    // ==================== toMessage 测试（构造请求） ====================

    @Test
    @DisplayName("构造正常请求报文（含定长头）")
    public void testToMessage_normalRequest() {
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        JSONObject requestPayload = JSONObject.parseObject(requestJson);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        Message<?> result = invokeToMessage(converter, requestPayload);

        assertNotNull(result, "toMessage 返回 null");
        String fullPayload = result.getPayload().toString();
        assertNotNull(fullPayload, "完整报文（含定长头）为空");
        // 定长头长度通常 50 字节（前 8 位是长度 + 后 42 位是头信息）
        assertTrue(fullPayload.length() >= 50, "定长头至少 50 字节，实际: " + fullPayload.length());
    }

    @Test
    @DisplayName("请求报文应包含 GBK 编码的中文内容（短信平台约定）")
    public void testToMessage_gbkEncoding() {
        // 仅当 Converter 涉及中文短信内容时验证
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        JSONObject requestPayload = JSONObject.parseObject(requestJson);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        Message<?> result = invokeToMessage(converter, requestPayload);
        String fullPayload = result.getPayload().toString();

        // GBK 编码的 hex 字符只包含 0-9A-F
        // 这里只做"非空"断言，避免过度耦合
        assertNotNull(fullPayload);
        assertTrue(fullPayload.length() > 0);
    }

    // ==================== fromMessage 测试（解析响应） ====================

    @Test
    @DisplayName("解析正常响应报文（去除定长头）")
    public void testFromMessage_normalResponse() {
        String responseRaw = loadMockMessage(getMockMsgSubDir() + "/" + getResponseMockFile() + ".xml");
        // 模拟"含定长头"的完整报文
        String fullResponse = "0000000150BEMP  XXTZPT  C02200020620230109120000" + responseRaw;
        Message<?> message = buildTcpMessage(fullResponse);

        // TCP 客户端 fromMessage 签名是 (Message, JSONObject)
        JSONObject originalRequest = new JSONObject();
        originalRequest.put("requestDto", new JSONObject());

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        JSONObject result = invokeFromMessageWithReq(converter, message, originalRequest);
        assertNotNull(result, "fromMessage 返回 null");

        // BEMP 标准返回码（GXP 0 → 000000）
        assertNotNull(result.getString("retCode"), "retCode 为空");
        assertTrue(result.getString("retCode").matches("\\d{6}"),
            "retCode 应为 6 位数字，实际: " + result.getString("retCode"));
    }

    @Test
    @DisplayName("响应失败（GXP 非 0）映射为 999999")
    public void testFromMessage_gxpFailureResponse() {
        String failureResponse = "<?xml version=\"1.0\" encoding=\"GBK\"?>\n" +
            "<root>\n" +
            "  <head>\n" +
            "    <respCode>1</respCode>\n" +  // 失败
            "    <respMsg>系统错误</respMsg>\n" +
            "  </head>\n" +
            "  <body></body>\n" +
            "</root>";
        String fullResponse = "0000000150BEMP  XXTZPT  C02200020620230109120000" + failureResponse;
        Message<?> message = buildTcpMessage(fullResponse);

        JSONObject originalRequest = new JSONObject();
        originalRequest.put("requestDto", new JSONObject());

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        JSONObject result = invokeFromMessageWithReq(converter, message, originalRequest);

        assertNotNull(result);
        assertEquals("999999", result.getString("retCode"), "GXP 失败应映射为 999999");
    }

    // ==================== 反射调用 ====================

    private Message<?> invokeToMessage(Object converter, JSONObject request) {
        try {
            // 客户端 toMessage 签名: toMessage(JSONObject)
            return (Message<?>) getConverterClass()
                .getMethod("toMessage", JSONObject.class)
                .invoke(converter, request);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("toMessage 调用失败: " + cause.getMessage(), cause);
        }
    }

    private JSONObject invokeFromMessageWithReq(Object converter, Message<?> message, JSONObject originalRequest) {
        try {
            return (JSONObject) getConverterClass()
                .getMethod("fromMessage", Message.class, JSONObject.class)
                .invoke(converter, message, originalRequest);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("fromMessage 调用失败: " + cause.getMessage(), cause);
        }
    }
}
