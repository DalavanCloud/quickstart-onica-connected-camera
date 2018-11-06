
#create packaged lambda.zip and source under quickstart functions dir
cd $(dirname $0)/../src
zip -r ../../../functions/packages/lambda.zip *
cd ../../../functions
rm -rf source/*
cd source
unzip ../packages/lambda.zip
rm -rf node_modules
