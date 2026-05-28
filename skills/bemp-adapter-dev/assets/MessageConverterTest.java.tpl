package com.hundsun.bemp.{{bank}}.adapter.msg.server.{{module}};

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
{{#XML_MODE}}
import com.hundsun.bemp.adapter.msg.converter.MessageXmlBuilder;
import com.hundsun.bemp.adapter.msg.xml.XmlDocument;
import com.hundsun.bemp.adapter.msg.xml.XmlNode;
import com.hundsun.bemp.{{bank}}.adapter.msg.common.MessageConstants;
import com.hundsun.bemp.{{bank}}.adapter.msg.util.HeadUtils;
import com.hundsun.bemp.{{bank}}.adapter.msg.util.XmlUtil;
{{/XML_MODE}}
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mockito;
import org.springframework.messaging.Message;

import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

/**
 * {{pice_code}}MessageConverter 单元测试
 *
 * 测试策略：纯Mock方式，不启动Spring上下文
 * - fromMessage: 验证外围报文字段到内部DTO的映射正确性
 * - toMessage: 验证内部响应到外围报文的组装正确性
 * - 边界场景: 空节点、空数组、null值处理
 */
public class {{pice_code}}MessageConverterTest {

    private {{pice_code}}MessageConverter converter;

    @Before
    public void setUp() {
        converter = new {{pice_code}}MessageConverter();
    }

    // ==================== fromMessage 测试 ====================

    {{#XML_MODE}}
    /**
     * 测试fromMessage - 正常XML报文解析
     * 验证所有字段映射关系与接口文档一致
     */
    @Test
    public void testFromMessage_normalRequest() {
        // 1. 构造Mock XML报文
        Message<?> message = mock(Message.class);
        XmlDocument xmlDocument = mock(XmlDocument.class);
        XmlNode rootNode = mock(XmlNode.class);
        XmlNode bodyNode = mock(XmlNode.class);
        XmlNode requestNode = mock(XmlNode.class);

        when(message.getPayload()).thenReturn(xmlDocument);
        when(xmlDocument.getRoot()).thenReturn(rootNode);
        when(rootNode.getSubNode("body")).thenReturn(bodyNode);
        when(bodyNode.getSubNode("request")).thenReturn(requestNode);

        // 2. Mock request节点下的字段值（按接口文档字段名）
        // {{FROM_MESSAGE_FIELD_MOCK_BLOCK}}

        // 3. 执行转换
        JSONObject result = converter.fromMessage(message);

        // 4. 验证映射结果（按内部DTO字段名）
        assertNotNull(result);
        JSONObject requestDto = result.getJSONObject("requestDto");
        assertNotNull(requestDto);
        // {{FROM_MESSAGE_ASSERT_BLOCK}}
    }

    /**
     * 测试fromMessage - 子节点为null时的容错处理
     * 验证可选子节点缺失时不影响主流程
     */
    @Test
    public void testFromMessage_subNodeNull() {
        Message<?> message = mock(Message.class);
        XmlDocument xmlDocument = mock(XmlDocument.class);
        XmlNode rootNode = mock(XmlNode.class);
        XmlNode bodyNode = mock(XmlNode.class);
        XmlNode requestNode = mock(XmlNode.class);

        when(message.getPayload()).thenReturn(xmlDocument);
        when(xmlDocument.getRoot()).thenReturn(rootNode);
        when(rootNode.getSubNode("body")).thenReturn(bodyNode);
        when(bodyNode.getSubNode("request")).thenReturn(requestNode);

        // 仅Mock主字段，子节点返回null
        // {{FROM_MESSAGE_REQUIRED_ONLY_MOCK_BLOCK}}

        JSONObject result = converter.fromMessage(message);

        assertNotNull(result);
        JSONObject requestDto = result.getJSONObject("requestDto");
        assertNotNull(requestDto);
        // {{FROM_MESSAGE_REQUIRED_ONLY_ASSERT_BLOCK}}
    }
    {{/XML_MODE}}

    {{#JSON_MODE}}
    /**
     * 测试fromMessage - 正常JSON报文解析
     * 验证JSON字段到内部DTO的映射正确性
     */
    @Test
    public void testFromMessage_normalRequest() {
        Message<?> message = mock(Message.class);
        JSONObject payload = new JSONObject();
        JSONObject body = new JSONObject();
        JSONObject requestDto = new JSONObject();

        // 构造请求JSON（按接口文档字段名）
        // {{FROM_MESSAGE_JSON_CONSTRUCT_BLOCK}}

        payload.put("body", body);
        when(message.getPayload()).thenReturn(payload);

        JSONObject result = converter.fromMessage(message);

        assertNotNull(result);
        // {{FROM_MESSAGE_ASSERT_BLOCK}}
    }
    {{/JSON_MODE}}

    // ==================== toMessage 测试 ====================

    {{#XML_MODE}}
    /**
     * 测试toMessage - 正常响应XML组装
     * 验证响应JSON到外围XML报文的字段映射
     */
    @Test
    public void testToMessage_normalResponse() {
        // 1. 构造原始消息（用于获取header）
        Message<?> message = mock(Message.class);
        XmlDocument xmlDocument = mock(XmlDocument.class);
        XmlNode rootNode = mock(XmlNode.class);
        XmlNode headerNode = mock(XmlNode.class);

        when(message.getPayload()).thenReturn(xmlDocument);
        when(xmlDocument.getRoot()).thenReturn(rootNode);
        when(rootNode.getSubNode("header")).thenReturn(headerNode);

        // 2. 构造服务响应JSON
        JSONObject response = new JSONObject();
        response.put("retCode", "0000");
        response.put("retMsg", "成功");
        // {{TO_MESSAGE_RESPONSE_CONSTRUCT_BLOCK}}

        // 3. 执行转换
        Message<?> result = converter.toMessage(message, response);

        // 4. 验证结果不为null
        assertNotNull(result);
    }

    /**
     * 测试toMessage - 空数组响应
     * 验证retData为空时不抛异常
     */
    @Test
    public void testToMessage_emptyRetData() {
        Message<?> message = mock(Message.class);
        XmlDocument xmlDocument = mock(XmlDocument.class);
        XmlNode rootNode = mock(XmlNode.class);
        XmlNode headerNode = mock(XmlNode.class);

        when(message.getPayload()).thenReturn(xmlDocument);
        when(xmlDocument.getRoot()).thenReturn(rootNode);
        when(rootNode.getSubNode("header")).thenReturn(headerNode);

        JSONObject response = new JSONObject();
        response.put("retCode", "0000");
        response.put("retMsg", "成功");

        Message<?> result = converter.toMessage(message, response);

        assertNotNull(result);
    }
    {{/XML_MODE}}

    {{#JSON_MODE}}
    /**
     * 测试toMessage - 正常响应JSON组装
     * 验证响应JSON直通或简单封装
     */
    @Test
    public void testToMessage_normalResponse() {
        Message<?> message = mock(Message.class);
        when(message.getPayload()).thenReturn(new JSONObject());

        JSONObject response = new JSONObject();
        response.put("retCode", "0000");
        response.put("retMsg", "成功");
        // {{TO_MESSAGE_JSON_CONSTRUCT_BLOCK}}

        Message<?> result = converter.toMessage(message, response);

        assertNotNull(result);
    }
    {{/JSON_MODE}}

    // ==================== getFunctionIdMapping 测试 ====================

    /**
     * 测试getFunctionIdMapping - 映射配置正确性
     * 数组最后一个元素必须是内部功能号
     */
    @Test
    public void testGetFunctionIdMapping() {
        String[] mapping = converter.getFunctionIdMapping();

        assertNotNull(mapping);
        assertTrue(mapping.length >= 2);
        assertEquals("{{pice_code}}", mapping[mapping.length - 1]);
        assertEquals("{{ext_service_code}}", mapping[0]);
    }
}
