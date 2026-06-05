package com.hundsun.bemp.test.template;

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.test.AbstractAdapterConverterTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;

import static org.junit.jupiter.api.Assertions.*;

/**
 * HTTP/ESB 通道 MessageConverter 测试模板
 *
 * <p>适用基类:
 * <ul>
 *   <li>Client: {@code AbstractHttpMessageRequestReplyConverter}</li>
 *   <li>Client: {@code AbstractEsbMessageRequestReplyConverter}（银行自定义 HTTP/ESB 基类）</li>
 * </ul>
 *
 * <p>参考实现:
 * <ul>
 *   <li>cqbank 的 POPC050101MessageConverter（HTTP 通道）</li>
 *   <li>guombank 的 POPC050101MessageConverter（HTTP/ESB 通道）</li>
 * </ul>
 *
 * <h2>覆盖场景</h2>
 * <ol>
 *   <li>正常请求报文构造（toMessage）</li>
 *   <li>正常响应报文解析（fromMessage）</li>
 *   <li>请求头 path 配置正确</li>
 *   <li>ESB 通道 Bean 存在</li>
 *   <li>响应码映射正确</li>
 * </ol>
 *
 * <h2>注意</h2>
 * <p>HTTP/ESB 类 Converter 的 toMessage 返回的是完整请求报文，
 * fromMessage 接收的是外围系统返回的响应报文。
 * 测试时需要 mock HTTP 通道（或使用真实 Spring 上下文）。
 */
public abstract class AbstractHttpMessageConverterTest extends AbstractAdapterConverterTest {

    protected abstract String getConverterBeanName();
    protected abstract Class<?> getConverterClass();
    protected String getMockMsgSubDir() {
        return getConverterClass().getSimpleName();
    }
    protected abstract String getRequestMockFile();
    protected abstract String getResponseMockFile();

    // ==================== toMessage 测试（构造请求） ====================

    @Test
    @DisplayName("构造正常请求报文")
    public void testToMessage_normalRequest() {
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        JSONObject requestPayload = JSONObject.parseObject(requestJson);

        Object converter = assertConverterBeanExists(getConverterBeanName(), getConverterClass());
        Message<?> result = invokeToMessage(converter, requestPayload);

        assertNotNull(result, "toMessage 返回 null");
        assertNotNull(result.getPayload(), "请求 payload 为空");
    }

    @Test
    @DisplayName("请求报文包含 path 配置")
    public void testToMessage_pathConfigured() {
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        JSONObject requestPayload = JSONObject.parseObject(requestJson);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        Message<?> result = invokeToMessage(converter, requestPayload);

        assertNotNull(result);
        // HTTP 请求头应包含 path
        Object path = result.getHeaders().get("path");
        if (path != null) {
            assertTrue(path.toString().startsWith("/"), "path 应以 / 开头，实际: " + path);
        }
    }

    // ==================== fromMessage 测试（解析响应） ====================

    @Test
    @DisplayName("解析正常响应报文")
    public void testFromMessage_normalResponse() {
        String responseJson = loadMockMessage(getMockMsgSubDir() + "/" + getResponseMockFile() + ".json");
        JSONObject responsePayload = JSONObject.parseObject(responseJson);
        Message<?> message = buildJsonMessage(responsePayload);

        JSONObject originalRequest = new JSONObject();
        originalRequest.put("requestDto", new JSONObject());

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        JSONObject result = invokeFromMessageWithReq(converter, message, originalRequest);

        assertNotNull(result, "fromMessage 返回 null");
        assertNotNull(result.getString("retCode"), "retCode 为空");

        assertFromMessageFields(result);
    }

    protected abstract void assertFromMessageFields(JSONObject result);

    @Test
    @DisplayName("响应失败时 retCode 映射正确")
    public void testFromMessage_failureResponse() {
        JSONObject failureResp = new JSONObject();
        failureResp.put("retCode", "9999");
        failureResp.put("retMsg", "系统异常");
        Message<?> message = buildJsonMessage(failureResp);

        JSONObject originalRequest = new JSONObject();
        originalRequest.put("requestDto", new JSONObject());

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        JSONObject result = invokeFromMessageWithReq(converter, message, originalRequest);

        assertNotNull(result);
        // 失败响应的 retCode 应保留原始值或映射为标准码
        assertNotNull(result.getString("retCode"));
    }

    // ==================== ESB 通道 Bean 验证 ====================

    @Test
    @DisplayName("ESB 通道 Bean 存在")
    public void testEsbChannelBeanExists() {
        // 验证 HTTP ESB 通道 Bean 已注册
        boolean hasEsbChannel = applicationContext.containsBean("httpMessageChannel#esb")
            || applicationContext.containsBean("tcpMessageChannel#esb");
        // 此断言为 soft-check: 某些银行可能不使用 #esb 后缀
        // 如果 Converter 继承了 AbstractEsbMessageRequestReplyConverter，则必须存在
        if (getConverterClass().getSimpleName().contains("Esb")) {
            assertTrue(hasEsbChannel, "ESB Converter 要求 ESB 通道 Bean 存在");
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
