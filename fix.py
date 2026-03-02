content = open('mpp_frontend/src/App.js','r',encoding='utf-8').read()
old = """    * {
      max-width: 100% !important;
      overflow-x: hidden !important;
      box-sizing: border-box !important;"""
new = """    * {
      box-sizing: border-box !important;"""
content = content.replace(old, new)
open('mpp_frontend/src/App.js','w',encoding='utf-8').write(content)
print('Done')
