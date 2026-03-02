content = open('mpp_frontend/src/App.js','r',encoding='utf-8').read()
content = content.replace(
    "maxHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto' }}>" ,
    "maxHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto' }} className='excel-scroll-container'>",
    2
)
open('mpp_frontend/src/App.js','w',encoding='utf-8').write(content)
print('Done')
