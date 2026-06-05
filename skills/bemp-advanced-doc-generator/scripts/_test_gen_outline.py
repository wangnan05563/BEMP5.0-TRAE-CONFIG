"""直接调用生成函数测试"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import paths

# 直接导入模块
import importlib.util
spec = importlib.util.spec_from_file_location("odg", os.path.join(os.path.dirname(__file__), "outline-design-generator.py"))
odg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(odg)

# 准备参数
template_path = r"d:\code\QJ\BEMP5.0DEV\docs\04【模板】概要设计说明书.doc"
scan_data_path = str(paths.OUTPUT_DIR / "_scan-data.json")
output_path = str(paths.OUTPUT_DIR / "河南农商-概要设计说明书-20260604.docx")

# 设置环境变量
os.environ['BEMP_UPDATE_FIELDS'] = 'true'

print(f"Template: {template_path}")
print(f"Scan data: {scan_data_path}")
print(f"Output: {output_path}")

# 检查文件存在
if not os.path.isfile(template_path):
    print(f"ERROR: Template not found: {template_path}")
    sys.exit(1)
if not os.path.isfile(scan_data_path):
    print(f"ERROR: Scan data not found: {scan_data_path}")
    sys.exit(1)

# 调用生成
try:
    result = odg.generate_outline_design(template_path, scan_data_path, output_path)
    print(f"Result: {result}")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"ERROR: {e}")
