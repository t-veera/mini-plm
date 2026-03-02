lines = open('mpp_frontend/src/App.js','r',encoding='utf-8').readlines()
# Remove the // we just added
for i in range(3186, 3196):
    lines[i] = lines[i].replace('//', '', 1)
# Wrap in JSX comment
lines[3186] = '                        {/*\n' + lines[3186]
lines[3195] = lines[3195] + '                        */}\n'
open('mpp_frontend/src/App.js','w',encoding='utf-8').writelines(lines)
print('Done')
