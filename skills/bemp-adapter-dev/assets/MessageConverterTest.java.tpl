package com.hundsun.bemp.{{bank}}.adapter.msg.{{side}}.{{module}};

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.test.AbstractAdapterConverterTest;
{{#XML_MODE}}
import com.hundsun.bemp.adapter.msg.xml.XmlDocument;
import com.hundsun.bemp.adapter.msg.xml.XmlNode;
{{/XML_MODE}}
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.Message;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

/**
 * {{pice_code}}MessageConverter 单元测试
 *
 * <p>测试策略：@SpringBootTest 真实 Spring 上下文 + mock 报文
 * <p>继承链: AbstractAdapterConverterTest → 本类
 *
 * <p>覆盖场景（MUST-5）：
 * <ol>
 *   <li>入参解析 — fromMessage 正确解析报文字段</li>
 *   <li>字段映射 — 外围字段到内部 DTO 的映射正确</li>
 *   <li>应答拼装 — toMessage 正确组装响应报文</li>
 *   <li>异常分支 — 报文非法/字段缺失时的容错</li>
 * </ol>
 *
 * <p>mock 报文路径: src/test/resources/mock-msg/{{pice_code}}MessageConverter/
 */
@SpringBootTest
@ActiveProfiles("test")
public class {{pice_code}}MessageConverterTest extends AbstractAdapterConverterTest {

    @Override
    protected String getConverterBeanName() {
        return "{{pice_code}}MessageConverter";
    }

    // ==================== fromMessage 测试 ====================

    {{#XML_MODE}}
    @Test
    @DisplayName("入参解析: 正常XML报文字段映射")
    public void testFromMessage_normalRequest() {
        // 1. 加载 mock 报文（MUST-2: 请求+应答报文必须存在）
        String requestXml = loadMockMessage("{{pice_code}}MessageConverter/{{bank}}_{{module}}_{{pice_code}}_{{biz}}_request.xml");

        // 2. 构造 Spring Message
        Message<?> message = buildXmlMessage(requestXml);

        // 3. 获取 Converter bean（真实 Spring 上下文）
        Object converter = assertConverterBeanExists("{{pice_code}}MessageConverter");

        // 4. 反射调用 fromMessage
        JSONObject result = invokeFromMessage(converter, message);
        assertNotNull(result, "fromMessage 返回 null");

        // 5. 校验基本结构
        JSONObject requestDto = result.getJSONObject("requestDto");
        assertNotNull(requestDto, "requestDto 为空");

        // 6. 字段映射断言（MUST-9: ≥3 个核心业务字段）
        // {{FROM_MESSAGE_ASSERT_BLOCK}}
    }

    @Test
    @DisplayName("异常分支: 子节点缺失容错")
    public void testFromMessage_optionalSubNodeMissing() {
        String minimalXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<transaction>\n" +
            "  <body><request></request></body>\n" +
            "</transaction>";
        Message<?> message = buildXmlMessage(minimalXml);

        Object converter = applicationContext.getBean("{{pice_code}}MessageConverter");
        JSONObject result = invokeFromMessage(converter, message);
        assertNotNull(result, "子节点缺失不应导致 fromMessage 返回 null");
    }
    {{/XML_MODE}}

    {{#JSON_MODE}}
    @Test
    @DisplayName("入参解析: 正常JSON报文字段映射")
    public void testFromMessage_normalRequest() {
        String requestJson = loadMockMessage("{{pice_code}}MessageConverter/{{bank}}_{{module}}_{{pice_code}}_{{biz}}_request.json");
        Message<?> message = buildJsonMessage(requestJson);

        Object converter = assertConverterBeanExists("{{pice_code}}MessageConverter");
        JSONObject result = invokeFromMessage(converter, message);
        assertNotNull(result, "fromMessage 返回 null");

        JSONObject requestDto = result.getJSONObject("requestDto");
        assertNotNull(requestDto, "requestDto 为空");

        // 字段映射断言（MUST-9: ≥3 个核心业务字段）
        // {{FROM_MESSAGE_ASSERT_BLOCK}}
    }

    @Test
    @DisplayName("异常分支: 字段缺失容错")
    public void testFromMessage_missingField() {
        JSONObject minimal = new JSONObject();
        minimal.put("requestDto", new JSONObject());
        Message<?> message = buildJsonMessage(minimal);

        Object converter = applicationContext.getBean("{{pice_code}}MessageConverter");
        JSONObject result = invokeFromMessage(converter, message);
        assertNotNull(result, "字段缺失不应导致 fromMessage 失败");
    }
    {{/JSON_MODE}}

    // ==================== toMessage 测试 ====================

    {{#SERVER_MODE}}
    @Test
    @DisplayName("应答拼装: 正常响应报文组装")
    public void testToMessage_normalResponse() {
        String requestXml = loadMockMessage("{{pice_code}}MessageConverter/{{bank}}_{{module}}_{{pice_code}}_{{biz}}_request.{{ext}}");
        Message<?> applyMessage = buildXmlMessage(requestXml);

        JSONObject serviceResponse = new JSONObject();
        serviceResponse.put("retCode", "000000");
        serviceResponse.put("retMsg", "成功");
        // {{TO_MESSAGE_RESPONSE_CONSTRUCT_BLOCK}}

        Object converter = applicationContext.getBean("{{pice_code}}MessageConverter");
        Message<?> result = invokeToMessage(converter, applyMessage, serviceResponse);
        assertNotNull(result, "toMessage 返回 null");

        Object payload = result.getPayload();
        assertNotNull(payload, "响应 payload 为空");
        String responseStr = payload.toString();
        assertTrue(responseStr.contains("retCode"), "响应应包含 retCode");
    }

    @Test
    @DisplayName("异常分支: 空数组响应不抛异常")
    public void testToMessage_emptyRetData() {
        String requestXml = loadMockMessage("{{pice_code}}MessageConverter/{{bank}}_{{module}}_{{pice_code}}_{{biz}}_request.{{ext}}");
        Message<?> applyMessage = buildXmlMessage(requestXml);

        JSONObject serviceResponse = new JSONObject();
        serviceResponse.put("retCode", "000000");
        serviceResponse.put("retMsg", "成功");

        Object converter = applicationContext.getBean("{{pice_code}}MessageConverter");
        Message<?> result = invokeToMessage(converter, applyMessage, serviceResponse);
        assertNotNull(result, "空 retData 不应导致 toMessage 失败");
    }
    {{/SERVER_MODE}}

    {{#CLIENT_MODE}}
    @Test
    @DisplayName("应答拼装: 构造正常请求报文")
    public void testToMessage_normalRequest() {
        String requestJson = loadMockMessage("{{pice_code}}MessageConverter/{{bank}}_{{module}}_{{pice_code}}_{{biz}}_request.json");
        JSONObject requestPayload = JSONObject.parseObject(requestJson);

        Object converter = assertConverterBeanExists("{{pice_code}}MessageConverter");
        Message<?> result = invokeClientToMessage(converter, requestPayload);
        assertNotNull(result, "toMessage 返回 null");
        assertNotNull(result.getPayload(), "请求 payload 为空");
    }

    @Test
    @DisplayName("入参解析: 解析正常响应报文")
    public void testFromMessage_normalResponse() {
        String responseJson = loadMockMessage("{{pice_code}}MessageConverter/{{bank}}_{{module}}_{{pice_code}}_{{biz}}_response.json");
        JSONObject responsePayload = JSONObject.parseObject(responseJson);
        Message<?> message = buildJsonMessage(responsePayload);

        JSONObject originalRequest = new JSONObject();
        originalRequest.put("requestDto", new JSONObject());

        Object converter = applicationContext.getBean("{{pice_code}}MessageConverter");
        JSONObject result = invokeFromMessageWithReq(converter, message, originalRequest);
        assertNotNull(result, "fromMessage 返回 null");
        assertNotNull(result.getString("retCode"), "retCode 为空");

        // 字段映射断言（MUST-9: ≥3 个核心业务字段）
        // {{FROM_MESSAGE_ASSERT_BLOCK}}
    }
    {{/CLIENT_MODE}}

    // ==================== getFunctionIdMapping 测试 ====================

    @Test
    @DisplayName("字段映射: getFunctionIdMapping 配置正确")
    public void testGetFunctionIdMapping() {
        Object converter = applicationContext.getBean("{{pice_code}}MessageConverter");
        try {
            String[] mapping = (String[]) converter.getClass()
                .getMethod("getFunctionIdMapping")
                .invoke(converter);
            assertNotNull(mapping, "getFunctionIdMapping 不应返回 null");
            assertTrue(mapping.length >= 2, "getFunctionIdMapping 应至少 2 个元素");
            assertEquals("{{pice_code}}", mapping[mapping.length - 1],
                "最后一个元素应为内部功能号");
        } catch (NoSuchMethodException e) {
            // WS 基类无 getFunctionIdMapping，跳过
        } catch (Exception e) {
            fail("调用 getFunctionIdMapping 失败: " + e.getMessage());
        }
    }

    // ==================== 反射调用辅助方法 ====================

    private JSONObject invokeFromMessage(Object converter, Message<?> message) {
        try {
            return (JSONObject) converter.getClass()
                .getMethod("fromMessage", Message.class)
                .invoke(converter, message);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("fromMessage 调用失败: " + cause.getMessage(), cause);
        }
    }

    private Message<?> invokeToMessage(Object converter, Message<?> applyMessage, JSONObject response) {
        try {
            return (Message<?>) converter.getClass()
                .getMethod("toMessage", Message.class, JSONObject.class)
                .invoke(converter, applyMessage, response);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("toMessage 调用失败: " + cause.getMessage(), cause);
        }
    }

    private Message<?> invokeClientToMessage(Object converter, JSONObject request) {
        try {
            return (Message<?>) converter.getClass()
                .getMethod("toMessage", JSONObject.class)
                .invoke(converter, request);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("toMessage 调用失败: " + cause.getMessage(), cause);
        }
    }

    private JSONObject invokeFromMessageWithReq(Object converter, Message<?> message, JSONObject originalRequest) {
        try {
            return (JSONObject) converter.getClass()
                .getMethod("fromMessage", Message.class, JSONObject.class)
                .invoke(converter, message, originalRequest);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new RuntimeException("fromMessage 调用失败: " + cause.getMessage(), cause);
        }
    }
}
