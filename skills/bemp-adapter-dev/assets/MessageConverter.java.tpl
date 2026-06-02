package com.hundsun.bemp.{{bank}}.adapter.msg.server.{{module}};

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
{{#XML_MODE}}
import com.hundsun.bemp.adapter.msg.converter.MessageXmlBuilder;
import com.hundsun.bemp.adapter.msg.core.AbstractMessageApplyResponseConverter;
import com.hundsun.bemp.adapter.msg.xml.XmlDocument;
import com.hundsun.bemp.adapter.msg.xml.XmlNode;
import com.hundsun.bemp.{{bank}}.adapter.msg.common.MessageConstants;
import com.hundsun.bemp.{{bank}}.adapter.msg.util.HeadUtils;
import com.hundsun.bemp.{{bank}}.adapter.msg.util.XmlUtil;
{{/XML_MODE}}
{{#JSON_BASE_MODE}}
import com.hundsun.bemp.{{bank}}.adapter.msg.server.YbinChannelBaseMessageApplyResponseConverter;
{{/JSON_BASE_MODE}}
{{#JSON_DIRECT_MODE}}
import com.hundsun.bemp.adapter.msg.core.AbstractMessageApplyResponseConverter;
{{/JSON_DIRECT_MODE}}
{{#QINN_XML_MODE}}
import com.hundsun.bemp.adapter.msg.converter.MessageXmlBuilder;
import com.hundsun.bemp.adapter.msg.converter.MessageXmlParser;
import com.hundsun.bemp.adapter.msg.core.AbstractMessageApplyResponseConverter;
import com.hundsun.bemp.adapter.msg.xml.XmlDocument;
import com.hundsun.bemp.adapter.msg.xml.XmlNode;
import com.hundsun.bemp.{{bank}}.adapter.msg.common.MessageConstants;
import com.hundsun.bemp.{{bank}}.adapter.msg.util.EncryptKeyUtils;
import com.hundsun.bemp.{{bank}}.adapter.msg.util.HeadUtils;
import com.hundsun.bemp.{{bank}}.adapter.msg.util.XmlUtil;
{{/QINN_XML_MODE}}
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

/**
 * {{interface_doc_brief}}
 *
 * <p>接口文档信息：
 * <ul>
 *   <li>外围系统: {{ext_system_name}} ({{ext_system_code}})</li>
 *   <li>外部服务码: {{ext_service_code}}</li>
 *   <li>内部功能号: {{pice_code}}</li>
 *   <li>报文方向: {{message_direction}} (server端被动接收 / client端主动调用)</li>
 *   <li>报文格式: {{message_format}} (XML / JSON)</li>
 *   <li>业务模块: {{module_name}}</li>
 * </ul>
 *
 * <p>字段映射概览：
 * <pre>
 * {{field_mapping_summary}}
 * </pre>
 *
 * @see {{product_service_class}} 产品服务接口
 * @see {{product_req_dto_class}} 请求DTO
 * @see {{product_res_dto_class}} 响应DTO
 */
{{#XML_MODE}}
@Component(value = "{{pice_code}}MessageConverter")
public class {{pice_code}}MessageConverter extends AbstractMessageApplyResponseConverter {
{{/XML_MODE}}
{{#JSON_BASE_MODE}}
@Component("{{pice_code}}MessageConverter")
public class {{pice_code}}MessageConverter extends YbinChannelBaseMessageApplyResponseConverter {
{{/JSON_BASE_MODE}}
{{#JSON_DIRECT_MODE}}
@Component("{{pice_code}}MessageConverter")
public class {{pice_code}}MessageConverter extends AbstractMessageApplyResponseConverter {
{{/JSON_DIRECT_MODE}}

    /**
     * 功能号映射配置
     *
     * <p>映射规则：数组最后一个元素是内部功能号，前面是外部服务码。
     * 消息路由公式：bean名 = functionId + "MessageConverter"
     * MqMessageInterceptor.preInvoke() 从报文提取msgCd，查FUNCTION_ID_MAP得到functionId，
     * 再通过Spring容器获取名为 functionId+"MessageConverter" 的bean。
     *
     * <p>本Converter映射：
     * <ul>
     *   <li>外部服务码: {{ext_service_code}} (外围系统广播的交易码)</li>
     *   <li>内部功能号: {{pice_code}} (产品服务@CloudFunction的functionId)</li>
     * </ul>
     *
     * @return 映射数组，格式为 [外部服务码, 内部功能号]
     */
    @Override
    public String[] getFunctionIdMapping() {
        return new String[]{
                "{{ext_service_code}}",
                "{{pice_code}}"
        };
    }

    {{#XML_MODE}}
    /**
     * 外围XML报文 → 内部JSON请求
     *
     * <p>解析流程：
     * 1. 从Message中获取XmlDocument载荷
     * 2. 按路径 root → body → request 定位请求节点
     * 3. 逐字段提取外围报文值，映射到内部DTO的JSON结构
     * 4. 通过HeadUtils.sysHeadToJson封装系统报文头
     * 5. 处理ECIF报文中tellerNo/orgCode的位置覆盖
     *
     * <p>字段映射明细：
     * <pre>
     * 外围字段(接口文档)           │ 外围路径              │ 内部DTO字段         │ 映射类型
     * ───────────────────────────┼──────────────────────┼────────────────────┼────────
     * {{field_mapping_table}}
     * </pre>
     *
     * @param message MQ消息，载荷为XmlDocument
     * @return 转换后的JSON请求，包含requestDto和Header
     */
    @Override
    public JSONObject fromMessage(Message<?> message) {
        XmlDocument xmlDocument = (XmlDocument) message.getPayload();
        XmlNode rootNode = xmlDocument.getRoot();

        JSONObject request = new JSONObject();
        XmlNode requestNode = rootNode.getSubNode("body").getSubNode("request");

        JSONObject requestDto = new JSONObject();

        // ---- 主字段映射（request节点直接子节点） ----
        // {{FIELD_MAPPING_BLOCK}}

        // ---- 子节点映射（数组/复合节点） ----
        // {{SUB_NODE_MAPPING_BLOCK}}

        request.put("requestDto", requestDto);

        // 系统报文头封装：从request节点提取sysHead相关字段
        JSONObject req = HeadUtils.sysHeadToJson(request, requestNode);

        // {{HEADER_OVERRIDE_BLOCK}}

        logger.info("{{pice_code}}MessageConverter请求json", req);
        return req;
    }

    /**
     * 内部JSON响应 → 外围XML报文
     *
     * <p>组装流程：
     * 1. 从原始Message获取header节点
     * 2. 通过HeadUtils.jsonToSysHead构建响应系统头
     * 3. 添加retCode/retMsg业务返回码
     * 4. 遍历retData数组，逐条组装响应明细
     *
     * <p>响应字段映射明细：
     * <pre>
     * 内部DTO字段              │ 外围响应字段           │ 说明
     * ────────────────────────┼───────────────────────┼────────────
     * {{response_field_mapping_table}}
     * </pre>
     *
     * @param message    原始MQ消息，用于获取header
     * @param jsonObject 服务响应JSON，包含retCode/retMsg/retData
     * @return 转换后的XML响应Message
     */
    @Override
    public Message<?> toMessage(Message<?> message, JSONObject jsonObject) {
        logger.info("{{pice_code}}MessageConverter响应json", jsonObject);
        XmlDocument xmlDocument = (XmlDocument) message.getPayload();
        XmlNode header = xmlDocument.getRoot().getSubNode("header");
        MessageXmlBuilder transaction = MessageXmlBuilder.create("transaction");
        MessageXmlBuilder response = HeadUtils.jsonToSysHead(header, jsonObject, transaction);

        // 业务返回码
        response.createElement("retCode").addText(jsonObject.getString("retCode"));
        response.createElement("retMsg").addText(jsonObject.getString("retMsg"));

        // 响应明细
        JSONArray retData = jsonObject.getJSONArray("retData");
        MessageXmlBuilder retDataXml = response.createElement("body").createElement("response");

        if (null != retData && retData.size() > 0) {
            MessageXmlBuilder list = retDataXml.createElement("list");
            for (int i = 0; i < retData.size(); i++) {
                JSONObject reqInfo = retData.getJSONObject(i);
                MessageXmlBuilder data = list.createElement("data").addAttribute(MessageConstants.NUM, String.valueOf(i + 1));
                // {{RESPONSE_FIELD_BLOCK}}
            }
        }

        return super.getMessage(response.asXML());
    }
    {{/XML_MODE}}

    {{#JSON_BASE_MODE}}
    /**
     * JSON报文模式下，基类YbinChannelBaseMessageApplyResponseConverter已实现通用逻辑：
     * - fromMessage: 从payload提取body节点直接返回
     * - toMessage: 通过XmlUtil.buildSuccessMessage构建成功响应
     *
     * <p>若本接口字段与外围完全一致（无需映射转换），则保持空实现；
     * 若需要字段映射或特殊处理，覆写fromMessage/toMessage方法。
     *
     * <p>字段映射明细（如有覆写）：
     * <pre>
     * 外围字段(接口文档)           │ 内部DTO字段         │ 映射类型
     * ───────────────────────────┼────────────────────┼────────
     * {{field_mapping_table}}
     * </pre>
     */
    {{/JSON_BASE_MODE}}

    {{#JSON_DIRECT_MODE}}
    /**
     * 外围JSON报文 → 内部JSON请求
     *
     * <p>解析流程：
     * 1. 从Message中获取JSONObject载荷
     * 2. 提取requestDto节点
     * 3. 按需进行字段映射或补充处理
     *
     * <p>字段映射明细：
     * <pre>
     * 外围字段(接口文档)           │ 内部DTO字段         │ 映射类型
     * ───────────────────────────┼────────────────────┼────────
     * {{field_mapping_table}}
     * </pre>
     *
     * @param message MQ消息，载荷为JSONObject
     * @return 转换后的JSON请求
     */
    @Override
    public JSONObject fromMessage(Message<?> message) {
        JSONObject jsonObject = (JSONObject) message.getPayload();
        JSONObject requestDto = jsonObject.getJSONObject("requestDto");

        // {{JSON_FROM_MESSAGE_BLOCK}}

        logger.info("{{pice_code}}MessageConverter请求json", jsonObject);
        return jsonObject;
    }

    /**
     * 内部JSON响应 → 外围JSON报文
     *
     * <p>JSON直通模式下，响应通常直接透传或简单封装
     *
     * @param message    原始MQ消息
     * @param jsonObject 服务响应JSON
     * @return 转换后的响应Message
     */
    @Override
    public Message<?> toMessage(Message<?> message, JSONObject jsonObject) {
        logger.info("{{pice_code}}MessageConverter响应json", jsonObject);
        // {{JSON_TO_MESSAGE_BLOCK}}
        return super.getMessage(jsonObject.toJSONString());
    }
    {{/JSON_DIRECT_MODE}}

    {{#QINN_XML_MODE}}
    /**
     * 外围XML报文 → 内部JSON请求（秦皇岛银行信贷模块XML模式）
     *
     * <p>解析流程：
     * 1. 从Message中获取解密后的XML字符串
     * 2. MessageXmlParser解析为XmlDocument
     * 3. 按路径 root → SERVICE_BODY 定位请求节点
     * 4. 逐字段提取外围报文值，映射到内部DTO的JSON结构
     * 5. 通过HeadUtils.sysHeadToJson封装系统报文头
     *
     * <p>字段映射明细：
     * <pre>
     * 外围字段(接口文档)           │ 外围路径              │ 内部DTO字段         │ 映射类型
     * ───────────────────────────┼──────────────────────┼────────────────────┼────────
     * {{field_mapping_table}}
     * </pre>
     *
     * @param message MQ消息，载荷为加密XML字符串
     * @return 转换后的JSON请求，包含requestDto和Header
     */
    @Override
    public JSONObject fromMessage(Message<?> message) {
        logger.info("{{pice_code}}MessageConverter 请求xml为：{}", message);
        String decryptString = message.getPayload().toString();
        MessageXmlParser xmlParser = MessageXmlParser.create();
        XmlDocument xmlDocument = xmlParser.parse(decryptString);
        XmlNode rootNode = xmlDocument.getRoot();

        JSONObject request = HeadUtils.sysHeadToJson(rootNode, "{{pice_code}}");
        XmlNode requestNode = rootNode.getSubNode(MessageConstants.SERVICE_BODY);

        JSONObject requestDto = new JSONObject();

        // ---- 主字段映射 ----
        // {{FIELD_MAPPING_BLOCK}}

        // ---- 数组节点映射 ----
        // {{ARRAY_NODE_MAPPING_BLOCK}}

        request.put(MessageConstants.REQUESTDTO, requestDto);
        return request;
    }

    /**
     * 内部JSON响应 → 外围XML报文
     *
     * <p>组装流程：
     * 1. 从原始Message获取SERVICE_HEADER节点
     * 2. 通过HeadUtils.createProcesses构建响应头
     * 3. 遍历retData数组，逐条组装BIZ_DATA_ARR
     * 4. XmlUtil.formatXml格式化XML
     * 5. EncryptKeyUtils加密响应报文
     *
     * @param message    原始MQ消息，用于获取header
     * @param jsonObject 服务响应JSON，包含retCode/retMsg/retData
     * @return 转换后的加密XML响应Message
     */
    @Override
    public Message<?> toMessage(Message<?> message, JSONObject jsonObject) {
        logger.info("{{pice_code}}MessageConverter 接收产品请求json为：" + jsonObject);
        XmlDocument xmlDocument = (XmlDocument) message.getPayload();
        XmlNode rootNode = xmlDocument.getRoot();
        XmlNode processes = rootNode.getSubNode(MessageConstants.SERVICE_HEADER);

        MessageXmlBuilder builder = MessageXmlBuilder.create(MessageConstants.SERVICE);
        MessageXmlBuilder header = builder.createElement(MessageConstants.SERVICE_HEADER);
        HeadUtils.createProcesses(processes, header, jsonObject);
        MessageXmlBuilder serviceBody = builder.createElement(MessageConstants.SERVICE_BODY);

        MessageXmlBuilder bizDataArr = serviceBody.createElement("BIZ_DATA_ARR");
        JSONArray retData = jsonObject.getJSONArray("retData");
        if (retData != null && retData.size() > 0) {
            for (int i = 0; i < retData.size(); i++) {
                JSONObject rspInfo = retData.getJSONObject(i);
                MessageXmlBuilder list = bizDataArr.createElement("Struct");
                // {{RESPONSE_FIELD_BLOCK}}
            }
        }
        String xml = XmlUtil.formatXml(builder.asXML());
        String encryptString = EncryptKeyUtils.getEncryptString(xml);
        logger.info("{{pice_code}}MessageConverter 返回给外围的报文为：" + xml);
        return super.getMessage(encryptString);
    }
    {{/QINN_XML_MODE}}
}
