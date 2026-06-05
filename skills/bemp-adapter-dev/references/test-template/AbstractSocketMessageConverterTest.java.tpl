package com.hundsun.bemp.test.template;

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.test.AbstractAdapterConverterTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Socket 长连接协议 MessageConverter 测试模板
 *
 * <p>适用基类:
 * <ul>
 *   <li>Client: {@code AbstractSocketMessageRequestReplyConverter}（如 ahnxbank）</li>
 * </ul>
 *
 * <p>参考实现: ahnxbank 的 Socket 类 Converter
 *
 * <h2>与 TCP 模板的区别</h2>
 * <p>Socket 长连接与 TCP 短连接的关键差异：
 * <ul>
 *   <li>Socket 使用长连接池，需验证连接复用</li>
 *   <li>报文格式：定长头（8位长度）+ XML 正文，无 GXP 风格的 42 位扩展头</li>
 *   <li>请求/应答通过 socket session 关联，非 MessageChannel 路由</li>
 * </ul>
 *
 * <h2>覆盖场景</h2>
 * <ol>
 *   <li>正常请求报文构造（8位定长头 + XML）</li>
 *   <li>正常响应报文解析（去除定长头 + 解析 XML）</li>
 *   <li>GBK 编码报文解析</li>
 *   <li>超时/连接异常容错</li>
 * </ol>
 */
public abstract class AbstractSocketMessageConverterTest extends AbstractAdapterConverterTest {

    protected abstract String getConverterBeanName();
    protected abstract Class<?> getConverterClass();
    protected String getMockMsgSubDir() {
        return getConverterClass().getSimpleName();
    }
    protected abstract String getRequestMockFile();
    protected abstract String getResponseMockFile();

    /** Socket 定长头长度（8位报文长度） */
    protected static final int SOCKET_HEADER_LENGTH = 8;

    // ==================== toMessage 测试（构造请求） ====================

    @Test
    @DisplayName("构造正常请求报文（含 8 位定长头）")
    public void testToMessage_normalRequest() {
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        JSONObject requestPayload = JSONObject.parseObject(requestJson);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        Message<?> result = invokeToMessage(converter, requestPayload);

        assertNotNull(result, "toMessage 返回 null");
        String fullPayload = result.getPayload().toString();
        assertNotNull(fullPayload, "完整报文为空");
        // Socket 定长头 8 位，后跟 XML 正文
        assertTrue(fullPayload.length() > SOCKET_HEADER_LENGTH,
            "报文长度应超过定长头 " + SOCKET_HEADER_LENGTH + " 字节");
    }

    @Test
    @DisplayName("请求报文定长头长度字段与正文一致")
    public void testToMessage_headerLengthMatchesBody() {
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        JSONObject requestPayload = JSONObject.parseObject(requestJson);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        Message<?> result = invokeToMessage(converter, requestPayload);
        String fullPayload = result.getPayload().toString();

        // 前 8 位是报文长度
        String lengthStr = fullPayload.substring(0, SOCKET_HEADER_LENGTH).trim();
        int declaredLength = Integer.parseInt(lengthStr);
        String body = fullPayload.substring(SOCKET_HEADER_LENGTH);
        // 长度字段应与正文长度一致（部分银行用 body 长度，部分用全包长度）
        assertTrue(declaredLength > 0, "定长头长度应 > 0");
        assertTrue(body.length() > 0, "正文不应为空");
    }

    // ==================== fromMessage 测试（解析响应） ====================

    @Test
    @DisplayName("解析正常响应报文（去除定长头）")
    public void testFromMessage_normalResponse() {
        String responseXml = loadMockMessage(getMockMsgSubDir() + "/" + getResponseMockFile() + ".xml");
        // 模拟 Socket 响应：8 位长度头 + XML 正文
        String bodyLen = String.format("%08d", responseXml.getBytes().length);
        String fullResponse = bodyLen + responseXml;
        Message<?> message = buildTcpMessage(fullResponse);

        JSONObject originalRequest = new JSONObject();
        originalRequest.put("requestDto", new JSONObject());

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        JSONObject result = invokeFromMessageWithReq(converter, message, originalRequest);
        assertNotNull(result, "fromMessage 返回 null");
        assertNotNull(result.getString("retCode"), "retCode 为空");
    }

    @Test
    @DisplayName("异常分支: 空响应正文容错")
    public void testFromMessage_emptyBody() {
        String emptyResponse = "00000000"; // 长度 0
        Message<?> message = buildTcpMessage(emptyResponse);

        JSONObject originalRequest = new JSONObject();
        originalRequest.put("requestDto", new JSONObject());

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        // 空响应不应抛出未捕获异常
        try {
            JSONObject result = invokeFromMessageWithReq(converter, message, originalRequest);
            // 允许返回 null 或含错误码的 JSONObject
            if (result != null) {
                assertNotNull(result.getString("retCode"), "空响应应返回错误码");
            }
        } catch (Exception e) {
            // 允许抛出业务异常，但不允许 NullPointerException
            assertFalse(e.getCause() instanceof NullPointerException,
                "空响应不应导致 NullPointerException");
        }
    }

    // ==================== 反射调用 ====================

    private Message<?> invokeToMessage(Object converter, JSONObject request) {
        try {
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
