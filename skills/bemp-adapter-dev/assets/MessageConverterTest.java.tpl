package com.hundsun.bemp.{{bank}}.adapter.msg.server.{{module}};

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
{{#XML_MODE}}
import com.hundsun.bemp.adapter.msg.converter.MessageXmlParser;
import com.hundsun.bemp.adapter.msg.xml.XmlDocument;
{{/XML_MODE}}
import org.junit.Before;
import org.junit.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.support.MessageBuilder;

import static org.junit.Assert.*;

/**
 * {{pice_code}}MessageConverter 单元测试
 * {{功能中文名}}
 *
 * 测试策略：构造真实模拟报文，使用MessageXmlParser解析，不启动Spring上下文
 * - 每个测试方法通过buildRequestXml/buildRequestJson构造完整模拟报文
 * - 覆盖正常解析、子节点缺失容错、响应组装、空数据容错、映射验证
 */
public class {{pice_code}}MessageConverterTest {

    private {{pice_code}}MessageConverter converter;

    @Before
    public void setUp() {
        converter = new {{pice_code}}MessageConverter();
    }

    {{#XML_MODE}}
    /**
     * 构造{{外围系统}}请求报文XML
     * 模拟外围系统发送的原始MQ报文，包含完整的header和body结构
     */
    private String buildRequestXml() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<transaction>" +
                "  <header>" +
                "    <ver>1.0</ver>" +
                "    <msg>" +
                "      <seqNb>{{流水号}}</seqNb>" +
                "      <msgCd>{{外部服务码}}</msgCd>" +
                "      <sndAppCd>{{外围系统}}</sndAppCd>" +
                "      <sndDt>{{日期}}</sndDt>" +
                "      <sndTm>{{时间}}</sndTm>" +
                "      <sndMbrCd>{{外围系统}}</sndMbrCd>" +
                "      <replyToQ>{{外围系统}}.RESP</replyToQ>" +
                "      <refCallTyp>SYN</refCallTyp>" +
                "    </msg>" +
                "  </header>" +
                "  <body>" +
                "    <request>" +
                "      <ebbsHdrReq>" +
                "        <opCode>{{pice_code}}</opCode>" +
                "        <version>01</version>" +
                "        <channelNo>{{渠道}}</channelNo>" +
                "        <reqFlowNo>{{请求流水号}}</reqFlowNo>" +
                "        <reqLegalNo>{{法人号}}</reqLegalNo>" +
                "      </ebbsHdrReq>" +
                "      {{FROM_MESSAGE_XML_FIELDS}}" +
                "    </request>" +
                "  </body>" +
                "</transaction>";
    }

    /**
     * 正常报文解析测试
     * 验证所有字段映射正确，包含Header字段覆盖（ECIF渠道）
     */
    @Test
    public void testFromMessage_normal() {
        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(buildRequestXml());
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject result = converter.fromMessage(message);

        JSONObject requestDto = result.getJSONObject("requestDto");
        assertNotNull("requestDto不应为null", requestDto);
        // {{FROM_MESSAGE_ASSERT_BLOCK}}

        // 验证Header字段（ECIF渠道需验证tellerNo/orgCode覆盖）
        JSONObject header = result.getJSONObject("Header");
        assertNotNull("Header不应为null", header);
        // {{FROM_MESSAGE_HEADER_ASSERT_BLOCK}}
    }

    /**
     * 子节点缺失时的容错处理
     * 验证可选子节点缺失时null检查生效，不抛NPE
     */
    @Test
    public void testFromMessage_missingSubNodes() {
        String xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<transaction>" +
                "  <header>" +
                "    <ver>1.0</ver>" +
                "    <msg>" +
                "      <seqNb>{{流水号}}</seqNb>" +
                "      <msgCd>{{外部服务码}}</msgCd>" +
                "      <sndAppCd>{{外围系统}}</sndAppCd>" +
                "      <sndDt>{{日期}}</sndDt>" +
                "      <sndTm>{{时间}}</sndTm>" +
                "      <sndMbrCd>{{外围系统}}</sndMbrCd>" +
                "      <replyToQ>{{外围系统}}.RESP</replyToQ>" +
                "      <refCallTyp>SYN</refCallTyp>" +
                "    </msg>" +
                "  </header>" +
                "  <body>" +
                "    <request>" +
                "      <ebbsHdrReq>" +
                "        <opCode>{{pice_code}}</opCode>" +
                "        <version>01</version>" +
                "        <channelNo>{{渠道}}</channelNo>" +
                "        <reqFlowNo>{{请求流水号}}</reqFlowNo>" +
                "        <reqLegalNo>{{法人号}}</reqLegalNo>" +
                "      </ebbsHdrReq>" +
                "      {{FROM_MESSAGE_REQUIRED_ONLY_FIELDS}}" +
                "    </request>" +
                "  </body>" +
                "</transaction>";

        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(xml);
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject result = converter.fromMessage(message);
        JSONObject requestDto = result.getJSONObject("requestDto");

        assertNotNull("requestDto不应为null", requestDto);
        // 子节点缺失时，对应字段应为null
        // {{FROM_MESSAGE_NULL_ASSERT_BLOCK}}
    }

    /**
     * 正常响应组装测试
     * 验证XML结构正确，包含retCode/retMsg/数据节点
     */
    @Test
    public void testToMessage_normal() {
        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(buildRequestXml());
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject responseJson = new JSONObject();
        responseJson.put("retCode", "0000");
        responseJson.put("retMsg", "成功");
        JSONArray retData = new JSONArray();
        JSONObject data = new JSONObject();
        // {{TO_MESSAGE_RESPONSE_CONSTRUCT_BLOCK}}
        retData.add(data);
        responseJson.put("retData", retData);

        Message<?> result = converter.toMessage(message, responseJson);

        assertNotNull("响应消息不应为null", result);
        String payload = (String) result.getPayload();
        assertTrue("响应应包含retCode", payload.contains("retCode"));
        // {{TO_MESSAGE_ASSERT_BLOCK}}
    }

    /**
     * retData为空时的容错处理
     * 验证空数组不导致异常，响应仍包含retCode/retMsg
     */
    @Test
    public void testToMessage_emptyRetData() {
        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(buildRequestXml());
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject responseJson = new JSONObject();
        responseJson.put("retCode", "0000");
        responseJson.put("retMsg", "成功");
        responseJson.put("retData", new JSONArray());

        Message<?> result = converter.toMessage(message, responseJson);

        assertNotNull("响应消息不应为null", result);
        String payload = (String) result.getPayload();
        assertTrue("响应应包含retCode", payload.contains("retCode"));
    }
    {{/XML_MODE}}

    {{#JSON_MODE}}
    /**
     * 构造外围系统请求JSON报文
     * 模拟外围系统发送的原始MQ JSON报文
     */
    private JSONObject buildRequestJson() {
        JSONObject payload = new JSONObject();
        JSONObject body = new JSONObject();
        JSONObject requestDto = new JSONObject();
        // {{FROM_MESSAGE_JSON_CONSTRUCT_BLOCK}}
        body.put("requestDto", requestDto);
        payload.put("body", body);
        return payload;
    }

    /**
     * 正常JSON报文解析测试
     * 验证JSON字段到内部DTO的映射正确性
     */
    @Test
    public void testFromMessage_normal() {
        JSONObject payload = buildRequestJson();
        Message<?> message = MessageBuilder.createMessage(payload, new MessageHeaders(null));

        JSONObject result = converter.fromMessage(message);

        assertNotNull("result不应为null", result);
        // {{FROM_MESSAGE_ASSERT_BLOCK}}
    }

    /**
     * 正常响应组装测试
     * 验证响应JSON直通或简单封装
     */
    @Test
    public void testToMessage_normal() {
        JSONObject payload = buildRequestJson();
        Message<?> message = MessageBuilder.createMessage(payload, new MessageHeaders(null));

        JSONObject responseJson = new JSONObject();
        responseJson.put("retCode", "0000");
        responseJson.put("retMsg", "成功");
        // {{TO_MESSAGE_JSON_CONSTRUCT_BLOCK}}

        Message<?> result = converter.toMessage(message, responseJson);

        assertNotNull("响应消息不应为null", result);
        String payloadStr = (String) result.getPayload();
        assertTrue("响应应包含retCode", payloadStr.contains("retCode"));
        // {{TO_MESSAGE_ASSERT_BLOCK}}
    }
    {{/JSON_MODE}}

    {{#QINN_XML_MODE}}
    /**
     * 构造外围信贷系统请求报文XML（秦皇岛银行信贷模块XML模式）
     * 模拟外围信贷系统发送的原始MQ报文，报文经过加密传输
     */
    private String buildRequestXml() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<{{MessageConstants.SERVICE}}>" +
                "  <{{MessageConstants.SERVICE_HEADER}}>" +
                "    <FrModCd>{{外围系统}}</FrModCd>" +
                "    <ToModCd>BEMP</ToModCd>" +
                "    <TxCd>{{外部服务码}}</TxCd>" +
                "    <SndDt>{{日期}}</SndDt>" +
                "    <SndTm>{{时间}}</SndTm>" +
                "    <SeqNb>{{流水号}}</SeqNb>" +
                "  </{{MessageConstants.SERVICE_HEADER}}>" +
                "  <{{MessageConstants.SERVICE_BODY}}>" +
                "    {{FROM_MESSAGE_XML_FIELDS}}" +
                "  </{{MessageConstants.SERVICE_BODY}}>" +
                "</{{MessageConstants.SERVICE}}>";
    }

    @Test
    public void testFromMessage_normal() {
        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(buildRequestXml());
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject result = converter.fromMessage(message);

        JSONObject requestDto = result.getJSONObject(MessageConstants.REQUESTDTO);
        assertNotNull("requestDto不应为null", requestDto);
        // {{FROM_MESSAGE_ASSERT_BLOCK}}
    }

    @Test
    public void testFromMessage_missingSubNodes() {
        String xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<{{MessageConstants.SERVICE}}>" +
                "  <{{MessageConstants.SERVICE_HEADER}}>...</{{MessageConstants.SERVICE_HEADER}}>" +
                "  <{{MessageConstants.SERVICE_BODY}}>" +
                "    {{FROM_MESSAGE_REQUIRED_ONLY_FIELDS}}" +
                "  </{{MessageConstants.SERVICE_BODY}}>" +
                "</{{MessageConstants.SERVICE}}>";

        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(xml);
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject result = converter.fromMessage(message);
        JSONObject requestDto = result.getJSONObject(MessageConstants.REQUESTDTO);

        assertNotNull("requestDto不应为null", requestDto);
        // {{FROM_MESSAGE_NULL_ASSERT_BLOCK}}
    }

    @Test
    public void testToMessage_normal() {
        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(buildRequestXml());
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject responseJson = new JSONObject();
        responseJson.put("retCode", "0000");
        responseJson.put("retMsg", "成功");
        JSONArray retData = new JSONArray();
        JSONObject data = new JSONObject();
        // {{TO_MESSAGE_RESPONSE_CONSTRUCT_BLOCK}}
        retData.add(data);
        responseJson.put("retData", retData);

        Message<?> result = converter.toMessage(message, responseJson);

        assertNotNull("响应消息不应为null", result);
        String payload = (String) result.getPayload();
        assertTrue("响应应包含retCode", payload.contains("retCode"));
        // {{TO_MESSAGE_ASSERT_BLOCK}}
    }

    @Test
    public void testToMessage_emptyRetData() {
        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(buildRequestXml());
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject responseJson = new JSONObject();
        responseJson.put("retCode", "0000");
        responseJson.put("retMsg", "成功");
        responseJson.put("retData", new JSONArray());

        Message<?> result = converter.toMessage(message, responseJson);

        assertNotNull("响应消息不应为null", result);
    }
    {{/QINN_XML_MODE}}

    {{#JSON_BASE_MODE}}
    /**
     * 构造外围系统请求JSON报文（宜宾银行JSON+基类模式）
     * 模拟外围系统发送的原始MQ JSON报文，payload包含body节点
     */
    private JSONObject buildRequestJson() {
        JSONObject payload = new JSONObject();
        JSONObject body = new JSONObject();
        JSONObject requestDto = new JSONObject();
        // {{FROM_MESSAGE_JSON_CONSTRUCT_BLOCK}}
        body.put("requestDto", requestDto);
        payload.put("body", body);
        return payload;
    }

    /**
     * 正常JSON报文解析测试
     * 基类从payload提取body节点，若子类有覆写则验证覆写逻辑
     */
    @Test
    public void testFromMessage_normal() {
        JSONObject payload = buildRequestJson();
        Message<?> message = MessageBuilder.createMessage(payload, new MessageHeaders(null));

        JSONObject result = converter.fromMessage(message);

        assertNotNull("result不应为null", result);
        // {{FROM_MESSAGE_ASSERT_BLOCK}}
    }

    @Test
    public void testToMessage_normal() {
        JSONObject payload = buildRequestJson();
        Message<?> message = MessageBuilder.createMessage(payload, new MessageHeaders(null));

        JSONObject responseJson = new JSONObject();
        responseJson.put("retCode", "0000");
        responseJson.put("retMsg", "成功");

        Message<?> result = converter.toMessage(message, responseJson);

        assertNotNull("响应消息不应为null", result);
        String payloadStr = (String) result.getPayload();
        assertTrue("响应应包含retCode", payloadStr.contains("retCode"));
        // {{TO_MESSAGE_ASSERT_BLOCK}}
    }
    {{/JSON_BASE_MODE}}

    /**
     * getFunctionIdMapping映射测试
     * 验证外部服务码与内部功能号映射关系正确
     * 数组最后一个元素必须是内部功能号
     */
    @Test
    public void testGetFunctionIdMapping() {
        String[] mapping = converter.getFunctionIdMapping();

        assertNotNull("映射不应为null", mapping);
        assertTrue("映射长度应>=2", mapping.length >= 2);
        assertEquals("内部功能号", "{{pice_code}}", mapping[mapping.length - 1]);
        assertEquals("外部服务码", "{{ext_service_code}}", mapping[0]);
    }
}