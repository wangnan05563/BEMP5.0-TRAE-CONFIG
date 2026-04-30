package com.hundsun.bemp.hnnxbank.biz.sm.service.[模块名].dto;

import com.hundsun.bemp.sm.service.[模块名].dto.[原Dto名]Dto;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

/**
 * 河南农信[功能描述]DTO
 * 扩展自产品化 [原Dto名]Dto，添加个性化功能所需的字段
 * @author [作者]
 * @date [日期]
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class Hnnx[原Dto名]Dto extends [原Dto名]Dto {
    /**
     * [字段描述]
     */
    private List<String> [字段名];
}
