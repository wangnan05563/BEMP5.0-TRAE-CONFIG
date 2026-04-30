package com.hundsun.bemp.hnnxbank.biz.sm.controller.[模块名];

import com.hundsun.bemp.fw.common.constant.CommonConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.*;
import com.hundsun.bemp.fw.controller.BaseServiceController;
import com.hundsun.bemp.fw.controller.UserContext;
import com.hundsun.bemp.hnnxbank.biz.sm.service.[模块名].Hnnx[服务名]Service;
import com.hundsun.bemp.sm.common.AuthConstant;
import com.hundsun.jrescloud.rpc.annotation.CloudReference;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * [功能描述]
 * @author [作者]
 * @date [日期]
 */
@RestController()
@RequestMapping("/hnnx/")
public class Hnnx[原Controller名]Controller extends BaseServiceController {
    private static final Logger LOGGER = LoggerFactory.getLogger(Hnnx[原Controller名]Controller.class);

    @CloudReference
    private Hnnx[服务名]Service hnnx[服务名]Service;

    /**
     * [方法描述]
     * @param req 请求参数
     * @param [Dto名]Dto 数据传输对象
     * @return 操作结果
     */
    @RequestMapping("[方法路径]")
    @ResponseBody
    public CommonResp [方法名](BaseRequest<[Dto名]Dto> req, [Dto名]Dto [Dto名]Dto) {
        if ([Dto名]Dto == null) {
            throw new BempRuntimeException("请求参数不能为空");
        }

        UserInfo userInfo = UserContext.get();
        String legalNo = userInfo.getLegalNo();

        [Dto名]Dto.setLegalNo(legalNo);
        req.setRequestDto([Dto名]Dto);

        hnnx[服务名]Service.[方法名](req);

        return resultCommonResp(true, "操作成功");
    }
}
