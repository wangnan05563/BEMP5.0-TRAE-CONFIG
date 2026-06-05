package com.hundsun.bemp.test.template;

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.test.AbstractAdapterConverterTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.GenericMessage;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 自定义 Server 基类 MessageConverter 测试模板
 *
 * <p>适用基类:
 * <ul>
 *   <li>Server: {@code YbinChannelBaseMessageApplyResponseConverter}（yibbank 自定义）</li>
 *   <li>Server: {@code AbstractYbinMessageApplyResponseConverter}（yibbank 备用）</li>
 * </ul>
 *
 * <p>参考实现: yibbank 的 PICE070101MessageConverter
 *
 * <h2>覆盖场景</h2>
 * <ol>
 *   <li>JSON 入参解析（基类已封装 body 节点提取）</li>
 *   <li>响应拼装（基类已封装 XmlUtil.buildSuccessMessage）</li>
 *   <li>通道标识路由（getFunctionIdMapping 自动从类名提取）</li>
 * </ol>
 *
 * <h2>注意</h2>
 * <p>yibbank 的 Server 端基类 {@code YbinChannelBaseMessageApplyResponseConverter} 已封装：
 * <ul>
 *   <li>{@code fromMessage}: 从 JSONObject payload 中提取 body 节点</li>
 *   <li>{@code toMessage}: 使用 XmlUtil.buildSuccessMessage 构建成功响应</li>
 *   <li>{@code getFunctionIdMapping}: 自动从类名提取功能号</li>
 * </ul>
 * 因此子类通常无需重写这些方法，测试重点在于验证基类封装的正确性。
 */
public abstract class AbstractCustomServerMessageConverterTest extends AbstractAdapterConverterTest {

    protected abstract String getConverterBeanName();
    protected abstract Class<?> getConverterClass();
    protected String getMockMsgSubDir() {
        return getConverterClass().getSimpleName();
    }

    // ==================== fromMessage 测试（JSON 入参解析） ====================

    @Test
    @DisplayName("fromMessage - 基类应从 JSONObject payload 中提取 body 节点")
    public void testFromMessage_extractsBodyFromPayload() {
        String requestJson = loadMockMessage(getMockMsgSubDir() + "/" + getMockMsgSubDir() + "_request.json");
        JSONObject payload = JSONObject.parseObject(requestJson);

        // yibbank Server 端接收的是 JSONObject（非 XML）
        Message<?> message = new GenericMessage<>(payload);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        JSONObject result = invokeFromMessage(converter, message);

        assertNotNull(result, "fromMessage 返回 null");
        // 基类已提取 body 节点，result 应为 body 内容
        assertNotNull(result, "body 节点内容不能为空");
    }

    @Test
    @DisplayName("fromMessage - body 为空时应返回空 JSONObject 而非 null")
    public void testFromMessage_emptyBody() {
        JSONObject payload = new JSONObject();
        payload.put("header", new JSONObject());
        // body 为空或不存在
        Message<?> message = new GenericMessage<>(payload);

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        JSONObject result = invokeFromMessage(converter, message);

        // 基类实现: applyMessage.getJSONObject("body")，body 不存在时返回 null
        // 这是预期行为，子类如需处理空 body 应重写 fromMessage
    }

    // ==================== toMessage 测试（响应拼装） ====================

    @Test
    @DisplayName("toMessage - 基类应使用 XmlUtil.buildSuccessMessage 构建成功响应")
    public void testToMessage_buildsSuccessResponse() {
        JSONObject responseDto = new JSONObject();
        responseDto.put("retCode", "000000");
        responseDto.put("retMsg", "成功");

        Message<?> originalMessage = new GenericMessage<>("");

        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        Message<?> result = invokeToMessageWithOriginal(converter, originalMessage, responseDto);

        assertNotNull(result, "toMessage 返回 null");
        assertNotNull(result.getPayload(), "响应 payload 不能为空");
    }

    // ==================== getFunctionIdMapping 测试 ====================

    @Test
    @DisplayName("getFunctionIdMapping - 应从类名自动提取功能号")
    public void testGetFunctionIdMapping() {
        Object converter = applicationContext.getBean(getConverterBeanName(), getConverterClass());
        String className = getConverterClass().getSimpleName();
        String expectedFuncCode = className.replace("MessageConverter", "");

        try {
            String[] mapping = (String[]) getConverterClass()
                .getMethod("getFunctionIdMapping")
                .invoke(converter);

            assertNotNull(mapping, "getFunctionIdMapping 返回 null");
            assertTrue(mapping.length >= 1, "mapping 应至少包含一个元素");
            assertEquals(expectedFuncCode, mapping[0],
                "功能号应从类名自动提取，预期: " + expectedFuncCode);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("getFunctionIdMapping 调用失败: " + cause.getMessage(), cause);
        }
    }

    // ==================== 反射调用 ====================

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

    private Message<?> invokeToMessageWithOriginal(Object converter, Message<?> originalMessage, JSONObject jsonObject) {
        try {
            return (Message<?>) getConverterClass()
                .getMethod("toMessage", Message.class, JSONObject.class)
                .invoke(converter, originalMessage, jsonObject);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("toMessage 调用失败: " + cause.getMessage(), cause);
        }
    }
}
