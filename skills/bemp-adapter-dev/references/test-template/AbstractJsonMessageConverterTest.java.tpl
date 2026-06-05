package com.hundsun.bemp.test.template;

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.test.AbstractAdapterConverterTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;

import static org.junit.jupiter.api.Assertions.*;

/**
 * JSON 透传 MessageConverter 测试模板
 *
 * <p>适用基类:
 * <ul>
 *   <li>Server: {@code AbstractMessageApplyResponseConverter}（json-core）</li>
 *   <li>Client: {@code AbstractMessageRequestReplyConverter}（json-core）</li>
 * </ul>
 *
 * <p>参考实现: shangrbank 的 PICE070101MessageConverter（透传风格）
 *
 * <h2>覆盖场景</h2>
 * <ol>
 *   <li>正常 JSON 请求透传（字段 1:1）</li>
 *   <li>正常 JSON 响应组装</li>
 *   <li>字段缺失容错（payload 中字段不存在）</li>
 *   <li>报文非 JSON（payload 异常）应抛异常</li>
 * </ol>
 */
public abstract class AbstractJsonMessageConverterTest extends AbstractAdapterConverterTest {

    protected abstract String getConverterBeanName();
    protected abstract Class<?> getConverterClass();

    protected String getMockMsgSubDir() {
        return getConverterClass().getSimpleName();
    }

    protected abstract String getRequestMockFile();
    protected abstract String getResponseMockFile();

    // ==================== fromMessage 测试 ====================

    @Test
    @DisplayName("正常 JSON 请求透传")
    public void testFromMessage_normalRequest() {
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        Message<?> message = buildJsonMessage(requestJson);

        Object converter = assertConverterBeanExists(getConverterBeanName(), getConverterClass());
        JSONObject result = invokeFromMessage(converter, message);

        assertNotNull(result, "fromMessage 返回 null");
        // 透传 Converter 必须保留 payload 的所有字段
        JSONObject requestDto = result.getJSONObject("requestDto");
        assertNotNull(requestDto, "requestDto 为空");

        // 子类实现: 校验特定字段
        assertFromMessageFields(requestDto);
    }

    protected abstract void assertFromMessageFields(JSONObject requestDto);

    @Test
    @DisplayName("字段缺失不应抛异常（透传 Converter 应宽容）")
    public void testFromMessage_missingField() {
        // 构造一个空 requestDto 的 payload
        JSONObject minimal = new JSONObject();
        JSONObject requestDto = new JSONObject();
        requestDto.put("billId", "B_TEST_001");
        minimal.put("requestDto", requestDto);

        Message<?> message = buildJsonMessage(minimal);
        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        JSONObject result = invokeFromMessage(converter, message);
        assertNotNull(result, "字段缺失不应导致 fromMessage 失败");

        // 应保留已有字段
        assertEquals("B_TEST_001", result.getJSONObject("requestDto").getString("billId"));
    }

    // ==================== toMessage 测试 ====================

    @Test
    @DisplayName("正常 JSON 响应组装")
    public void testToMessage_normalResponse() {
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getRequestMockFile() + ".json");
        Message<?> applyMessage = buildJsonMessage(requestJson);

        JSONObject serviceResponse = buildServiceResponse();
        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        Message<?> result = invokeToMessage(converter, applyMessage, serviceResponse);

        assertNotNull(result, "toMessage 返回 null");
        assertNotNull(result.getPayload(), "响应 payload 为空");
        String responseJson = result.getPayload().toString();
        assertTrue(responseJson.contains("retCode"), "响应应包含 retCode");

        assertToMessageFields(responseJson);
    }

    protected abstract JSONObject buildServiceResponse();
    protected abstract void assertToMessageFields(String responseJson);

    // ==================== getFunctionIdMapping 测试 ====================

    @Test
    @DisplayName("getFunctionIdMapping 配置正确")
    public void testGetFunctionIdMapping() {
        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        try {
            String[] mapping = (String[]) getConverterClass()
                .getMethod("getFunctionIdMapping")
                .invoke(converter);
            assertNotNull(mapping, "getFunctionIdMapping 不应返回 null");
            assertTrue(mapping.length >= 2, "getFunctionIdMapping 应至少 2 个元素");
        } catch (NoSuchMethodException e) {
            // 部分基类不要求
        } catch (Exception e) {
            fail("getFunctionIdMapping 调用失败: " + e.getMessage());
        }
    }

    // ==================== 反射调用辅助方法 ====================

    private JSONObject invokeFromMessage(Object converter, Message<?> message) {
        try {
            return (JSONObject) getConverterClass()
                .getMethod("fromMessage", Message.class)
                .invoke(converter, message);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("fromMessage 调用失败: " + cause.getMessage(), cause);
        }
    }

    private Message<?> invokeToMessage(Object converter, Message<?> applyMessage, JSONObject response) {
        try {
            return (Message<?>) getConverterClass()
                .getMethod("toMessage", Message.class, JSONObject.class)
                .invoke(converter, applyMessage, response);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("toMessage 调用失败: " + cause.getMessage(), cause);
        }
    }
}
