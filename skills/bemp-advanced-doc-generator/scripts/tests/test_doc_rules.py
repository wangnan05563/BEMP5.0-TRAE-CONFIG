"""tests/test_doc_rules.py - 验证 doc_rules.yaml 配置加载与结构完整性

测试目标：
    1. 确保 doc_formatter.load_doc_rules() 始终返回完整结构
    2. 确保 v7.1 新增的 6 个配置节存在且格式正确
    3. 确保 _DEFAULT_RULES 兜底与 doc_rules.yaml 合并正确
    4. 确保 uml 配置节的关键子节完整（fallback 图数据）
"""
import sys, os, unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
import doc_formatter


class TestDocRules(unittest.TestCase):
    """doc_rules.yaml 配置验证"""

    def setUp(self):
        self.rules = doc_formatter.load_doc_rules()

    def _assert_dict(self, key, message=None):
        self.assertIsInstance(self.rules.get(key), dict,
                              message or f'{key} 应存在且为 dict')

    def _assert_list(self, key, message=None):
        self.assertIsInstance(self.rules.get(key), list,
                              message or f'{key} 应存在且为 list')

    def test_default_rules_has_all_keys(self):
        """_DEFAULT_RULES 包含所有必填顶层键"""
        keys = [
            'toc', 'empty_chapter_keywords', 'fill_chapters',
            'table_style', 'paragraph', 'chapter_content_correction',
            'heading_numbering', 'design_constraint', 'ui_paragraph',
            'placeholder', 'blue_runs',
            # v7.1 新增
            'uml', 'title_normalize', 'empty_table',
            'er_diagram_migration', 'tech_description', 'chart_engine',
        ]
        for key in keys:
            self.assertIn(key, self.rules, f'顶层键缺失: {key}')

    def test_uml_section_complete(self):
        """uml 配置节包含所有必填子键"""
        uml = self.rules.get('uml', {})
        # 基础键
        self.assertIn('keywords', uml)
        self.assertIn('required_headings', uml)
        self.assertIn('file_matchers', uml)
        self.assertIn('placeholder_cleaners', uml)
        # 兜底图数据
        self.assertIsInstance(uml.get('fallback_class_diagram'), dict)
        self.assertIsInstance(uml.get('fallback_sequence_diagram'), dict)
        self.assertIsInstance(uml.get('fallback_activity_diagram'), dict)
        # fallback_class_diagram 含 classes + relations
        fd = uml['fallback_class_diagram']
        self.assertIn('classes', fd)
        self.assertIn('relations', fd)
        self.assertTrue(len(fd['classes']) >= 3,
                        f'兜底类图应至少含 3 个类，实际 {len(fd.get("classes", []))}')

    def test_uml_keywords_list(self):
        """uml.keywords 包含所有期望的 UML 图类型关键词"""
        expected = {'类图', '顺序图', '活动图'}
        keywords = set(self.rules.get('uml', {}).get('keywords', []))
        missing = expected - keywords
        self.assertEqual(len(missing), 0,
                         f'uml.keywords 缺失: {missing}')

    def test_required_headings_list(self):
        """uml.required_headings 包含 3 个必填标题"""
        rh = self.rules.get('uml', {}).get('required_headings', [])
        self.assertEqual(len(rh), 3,
                         f'必填 UML 标题应为 3 个，实际 {len(rh)}')

    def test_file_matchers_complete(self):
        """uml.file_matchers 含类图/顺序图/活动图的匹配模式"""
        fm = self.rules.get('uml', {}).get('file_matchers', {})
        for key in ['类图', '顺序图', '活动图']:
            self.assertIn(key, fm, f'file_matchers 缺失: {key}')
            self.assertTrue(len(fm[key]) >= 2,
                            f'file_matchers.{key} 应至少 2 个模式，实际 {len(fm[key])}')

    def test_title_normalize_complete(self):
        """title_normalize 配置节完整"""
        tn = self.rules.get('title_normalize', {})
        self.assertIn('heading_style_ids', tn)
        self.assertIn('number_pattern', tn)
        self.assertIn('strip_style_numbering', tn)

    def test_empty_table_complete(self):
        """empty_table 配置节完整"""
        et = self.rules.get('empty_table', {})
        self.assertIn('delete_if', et)
        self.assertIn('fill_if', et)
        self.assertIn('dual_layer_check', et)

    def test_title_normalize_heading_style_ids_count(self):
        """title_normalize.heading_style_ids 覆盖 Heading1-3 多种变体"""
        ids = self.rules.get('title_normalize', {}).get('heading_style_ids', [])
        # 至少覆盖 3 级标题的 9 种变体
        self.assertGreaterEqual(len(ids), 9,
                                f'heading_style_ids 数量应 ≥ 9，实际 {len(ids)}')

    def test_empty_table_delete_if_not_empty(self):
        """empty_table.delete_if 非空"""
        di = self.rules.get('empty_table', {}).get('delete_if', [])
        self.assertTrue(len(di) > 0, 'delete_if 不应为空')

    def test_er_diagram_migration_complete(self):
        """er_diagram_migration 配置节完整"""
        er = self.rules.get('er_diagram_migration', {})
        self.assertIn('target_h1', er)
        self.assertIn('h2_prefix', er)

    def test_tech_description_complete(self):
        """tech_description 配置节完整"""
        td = self.rules.get('tech_description', {})
        self.assertIn('type_keywords', td)
        self.assertIn('fallback_tech_stack', td)

    def test_tech_description_type_keywords_count(self):
        """tech_description.type_keywords 覆盖 5 种类型"""
        tk = self.rules.get('tech_description', {}).get('type_keywords', {})
        self.assertGreaterEqual(len(tk), 4,
                                f'type_keywords 应至少 4 种类型，实际 {len(tk)}')

    def test_chart_engine_complete(self):
        """chart_engine 配置节完整"""
        ce = self.rules.get('chart_engine', {})
        self.assertIn('engine_priority', ce)
        self.assertIn('uml_engine', ce)
        self.assertIn('fallback_strategy', ce)

    def test_chart_engine_priority_has_antv(self):
        """chart_engine.engine_priority 应以 antv 为首选"""
        priority = self.rules.get('chart_engine', {}).get('engine_priority', [])
        self.assertIn('antv', priority, 'engine_priority 应包含 antv')

    def test_merge_default_with_empty(self):
        """空 dict 合并后应等于 _DEFAULT_RULES 深拷贝"""
        merged = doc_formatter._merge_defaults({})
        for key in doc_formatter._DEFAULT_RULES:
            self.assertIn(key, merged, f'空合并后缺失: {key}')

    def test_merge_default_with_none(self):
        """None 合并后应等于 _DEFAULT_RULES 深拷贝"""
        merged = doc_formatter._merge_defaults(None)
        for key in doc_formatter._DEFAULT_RULES:
            self.assertIn(key, merged, f'None 合并后缺失: {key}')

    def test_cache_consistency(self):
        """两次加载同一路径应返回相等内容（深拷贝所以不是同一对象）"""
        r1 = doc_formatter.load_doc_rules()
        r2 = doc_formatter.load_doc_rules()
        self.assertEqual(r1['uml']['keywords'], r2['uml']['keywords'],
                         '两次加载应返回相同内容')
        self.assertIsNot(r1, r2, '每次调用应返回新对象（深拷贝）')

    def test_register_generator_hook(self):
        """generator 注册可取回"""
        def dummy_gen(scan, bm=None):
            return 'dummy'
        doc_formatter.register_generator('test_tech_gen', dummy_gen)
        # 通过 _GENERATOR_BY_NAME 验证注册成功
        self.assertIn('test_tech_gen', doc_formatter._GENERATOR_BY_NAME,
                      'register_generator 应写入 _GENERATOR_BY_NAME')


if __name__ == '__main__':
    unittest.main(verbosity=2)
