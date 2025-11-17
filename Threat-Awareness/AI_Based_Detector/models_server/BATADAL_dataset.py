# -*- coding: utf-8 -*-
"""
Created on Thu May  6 09:33:27 2021

@author: hsk
"""
import platform
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.preprocessing import RobustScaler
from sklearn.preprocessing import PowerTransformer
from datetime import datetime, timezone, timedelta
from configparser import ConfigParser

normal = 0
anomaly = 1


def createAttackIndexList(LabelData):
     attackIndexList = [('benign', [])] # the name given here just seems to be the name
     if len(LabelData) != 0:
         labels = LabelData.unique()
         for label in labels:
             found = False
             if label == 'benign':
                 attackIndexList[0][1].extend((LabelData.index[LabelData == label].to_numpy()).tolist())
                 found = True
             else:
                 for i in range(1, len(attackIndexList)):
                     if attackIndexList[i][0] == label:
                         attackIndexList[i][1].extend((LabelData.index[LabelData == label].to_numpy()).tolist())
                         found = True
             if found == False:
                 attackIndexList.append((label, (LabelData.index[LabelData == label].to_numpy()).tolist()))
     return attackIndexList

#based on the given input format extract the month, the time, the day, the year and the hour (minutes and seconds are
#not present in the dataset)
def add_time_based_features(df):
    df['DATETIME']= pd.to_datetime(df['DATETIME'],format='%d/%m/%y %H')
    df['month'] = df['DATETIME'].dt.month
    df['time']=df['DATETIME'].dt.time
    df['day']=df['DATETIME'].dt.day
    df['year']=df['DATETIME'].dt.year
    df['hour']=df['DATETIME'].dt.hour
    df['dayofweek']=df['DATETIME'].dt.dayofweek
    return df

#add labels for the intermediate test data (based on known attacks, given on a sheet)
def label_intermediate_testdata(df):
    #first label anything as benign and then later on specify the lines with an attack
    #df.loc[df['ATT_FLAG']=='-999','ATT_FLAG']='benign'
    df['ATT_FLAG']='benign'
    df.loc[(df['DATETIME']>= datetime(2016,9,13,23)) & (df['DATETIME']<= datetime(2016,9,16,0)),'ATT_FLAG']='attack1'
    df.loc[(df['DATETIME']>= datetime(2016,9,26,11)) & (df['DATETIME']<= datetime(2016,9,27,10)),'ATT_FLAG']='attack2'
    df.loc[(df['DATETIME']>= datetime(2016,10,9,9)) & (df['DATETIME']<= datetime(2016,10,11,20)),'ATT_FLAG']='attack3'
    df.loc[(df['DATETIME']>= datetime(2016,10,29,19)) & (df['DATETIME']<= datetime(2016,11,2,16)),'ATT_FLAG']='attack4'
    df.loc[(df['DATETIME']>= datetime(2016,11,26,17)) & (df['DATETIME']<= datetime(2016,11,29,4)),'ATT_FLAG']='attack5'
    df.loc[(df['DATETIME']>= datetime(2016,12,6,7)) & (df['DATETIME']<= datetime(2016,12,10,4)),'ATT_FLAG']='attack6'
    df.loc[(df['DATETIME']>= datetime(2016,12,14,15)) & (df['DATETIME']<= datetime(2016,12,19,4)),'ATT_FLAG']='attack7'
    return df

#add labels for the final test data (based on known attacks, given on a sheet)
def label_final_testdata(df):
    #for final test data there is initially no flag
    df['ATT_FLAG'] = 'benign'
    df.loc[(df['DATETIME']>= datetime(2017,1,16,9)) & (df['DATETIME']<= datetime(2017,1,19,6)),'ATT_FLAG']='attack8'
    df.loc[(df['DATETIME']>= datetime(2017,1,30,8)) & (df['DATETIME']<= datetime(2017,2,2,0)),'ATT_FLAG']='attack9'
    df.loc[(df['DATETIME']>= datetime(2017,2,9,3)) & (df['DATETIME']<= datetime(2017,2,10,9)),'ATT_FLAG']='attack10'
    df.loc[(df['DATETIME']>= datetime(2017,2,12,1)) & (df['DATETIME']<= datetime(2017,2,13,7)),'ATT_FLAG']='attack11'
    df.loc[(df['DATETIME']>= datetime(2017,2,24,5)) & (df['DATETIME']<= datetime(2017,2,28,8)),'ATT_FLAG']='attack12'
    df.loc[(df['DATETIME']>= datetime(2017,3,10,14)) & (df['DATETIME']<= datetime(2017,3,13,21)),'ATT_FLAG']='attack13'
    df.loc[(df['DATETIME']>= datetime(2017,3,25,20)) & (df['DATETIME']<= datetime(2017,3,27,1)),'ATT_FLAG']='attack14'
    return df

#Apply the standard scaler to test and training dataframe for selected features.
def standardScaling(dfTrain,dfTest,features):
    standardScaler = StandardScaler()
    scalerFunction = standardScaler.fit(dfTrain[features])
    npscale = standardScaler.transform(dfTrain[features])
    ssdfTrain = pd.DataFrame(data=npscale,columns = dfTrain[features].columns)
    npscaleT = standardScaler.transform(dfTest[features])
    ssdfTest = pd.DataFrame(data = npscaleT,columns = dfTest[features].columns)
    return [standardScaler,scalerFunction, ssdfTrain, ssdfTest]

#Apply the robust scaleing (especially suited for outlier detection) to test and training dataframe for selected features.
def robustScaling(dfTrain,dfTest,features):
    robustScaler = RobustScaler()
    scalerFunction = robustScaler.fit(dfTrain[features])
    npscale = robustScaler.transform(dfTrain[features])
    rsdfTrain=pd.DataFrame(data=npscale,columns = dfTrain[features].columns)
    npscaleT = robustScaler.transform(dfTest[features])
    rsdfTest = pd.DataFrame(data=npscaleT,columns=dfTest[features].columns)
    return [robustScaler,scalerFunction,rsdfTrain,rsdfTest]

def powerTransformation(dfTrain,dfTest,features):
    pt = PowerTransformer(method = 'yeo-johnson')
    scalerFunction = pt.fit(dfTrain[features])
    npscale = pt.transform(dfTrain[features])
    ptdfTrain = pd.DataFrame(data=npscale,columns = dfTrain[features].columns)
    npscaleT = pt.transform(dfTest[features])
    ptdfTest = pd.DataFrame(data=npscaleT,columns= dfTest[features].columns)
    return [pt,scalerFunction,ptdfTrain,ptdfTest]

#Transform hours, day of the week, month and day with sinus and cosinus to reflect the periodic behavior.
#the year is not considered, since it might bias the data
def timeTransformation(df):
    hours_in_day = 24 
    month_in_year = 12  
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    df['sin_hours'] = np.sin(2*np.pi*df.hour/hours_in_day)
    df['cos_hours'] = np.cos(2*np.pi*df.hour/hours_in_day)

    df['sin_dayofweek'] = np.sin(2*np.pi*df.dayofweek/7)
    df['cos_dayofweek'] = np.cos(2*np.pi*df.dayofweek/7)

    df['sin_month'] = np.sin(2*np.pi*df.month/month_in_year)
    df['cos_month'] = np.cos(2*np.pi*df.month/month_in_year)

    #For days the maxiumum need the be the maximum of days within the given month, see https://medium.com/@dan.allison/how-to-encode-the-cyclic-properties-of-time-with-python-6f4971d245c0
    df['sin_day']= df.apply(lambda x: np.sin(2*np.pi*x['day']/days_in_month[x['month']-1]),axis = 1)
    df['cos_day']= df.apply(lambda x: np.cos(2*np.pi*x['day']/days_in_month[x['month']-1]),axis = 1)

    return df

#TODO: split is not implemented at the moment. There is currently no difference if it is true or not.
def load_BATADAL_Dataset():

    TrainDataRoot = r"C:\Users\Michael.Somma\Documents\SerWas\SeRWas_edge_detection\edge_device\data\Training"
    TestDataRoot =  r"C:\Users\Michael.Somma\Documents\SerWas\SeRWas_edge_detection\edge_device\data\Test"


    filenameList = [TrainDataRoot + "/BATADAL_dataset03.csv", TrainDataRoot + "/BATADAL_dataset04.csv", TestDataRoot + "/BATADAL_test_dataset.csv"]

    # definition of train and (intermediate) test data files
    train = pd.read_csv(TrainDataRoot + "/BATADAL_dataset03.csv",sep = ',')
    print(train.shape)
    lineIndex0 = np.arange(train.shape[0])
    fileIndex0 = np.full(len(lineIndex0), 0)
    intermediate = pd.read_csv(TrainDataRoot + "/BATADAL_dataset04.csv",sep = ', ')
    lineIndex1 = np.arange(intermediate.shape[0])
    fileIndex1 = np.full(len(lineIndex1), 1)

    trainLineIndex = np.concatenate((lineIndex0, lineIndex1))
    trainFileIndex = np.concatenate((fileIndex0, fileIndex1))

    test = pd.read_csv(TestDataRoot + "/BATADAL_test_dataset.csv",sep = ',')
    testLineIndex = np.arange(test.shape[0])
    testFileIndex = np.full(len(testLineIndex), 2)

    #print(test.head())

    #include time based features
    train = add_time_based_features(train)
    train['ATT_FLAG']='benign'

    #intermediate test dataset, the " needs to be removed
    #intermediate.rename(columns={'"DATETIME': 'DATETIME', 'ATT_FLAG"': 'ATT_FLAG'},inplace = True)
    #intermediate['DATETIME'] = intermediate['DATETIME'].str.replace('"','')
    #intermediate['ATT_FLAG'] = intermediate['ATT_FLAG'].str.replace('"','')

    #include time based features
    intermediate = add_time_based_features(intermediate)
    test = add_time_based_features(test)

    #transform the time (with sinus and cosinus to reflect the periodic behaviour)
    train = timeTransformation(train)
    intermediate = timeTransformation(intermediate)
    test = timeTransformation(test)

    #properly name the attacks (in the original intermediate dataset not all attack flows are labelled)
    intermediate = label_intermediate_testdata(intermediate)
    test = label_final_testdata(test)
    # print(type(train))  # Check the type of train DataFrame
    # print(type(intermediate))
    fullTrain = pd.concat([train, intermediate], ignore_index=True)
    # fullTrain = train

    #print(fullTrain['ATT_FLAG'].value_counts())

    attackIndexListTrain = createAttackIndexList(fullTrain['ATT_FLAG'])
    attackIndexListTest = createAttackIndexList(test['ATT_FLAG'])

    yTrain = np.ones((len(fullTrain),), dtype=int)
    yTest = np.ones((len(test),), dtype=int)

    yTrain[attackIndexListTrain[0][1]] = 0
    yTest[attackIndexListTest[0][1]] = 0

    #these features shall not be used for the transformation
    features = fullTrain.columns.tolist()
    features.remove('ATT_FLAG')
    features.remove('month')
    features.remove('time')
    features.remove('day')
    features.remove('year')
    features.remove('hour')
    features.remove('dayofweek')
    features.remove('DATETIME')



    #preprocessing: Select either the standard scaler or robust scaling
    #[scaler,scalerFunction, ssdfTrain, ssdfTest] = standardScaling(fullTrain,test,features)
    [scaler,scalerFunction, ssdfTrain, ssdfTest] = robustScaling(fullTrain,test,features)
    #[scaler,scalerFunction, ssdfTrain, ssdfTest] = powerTransformation(fullTrain,test,features)

    xTrain = ssdfTrain.to_numpy()

    yTrain = np.expand_dims(yTrain, axis = 1)

    xTest = ssdfTest.to_numpy()

    yTest = np.expand_dims(yTest, axis = 1)

    print('train x data: ', xTrain.shape)
    print('train y data: ', yTrain.shape)
    print('Number of anomaly feature vectors:', np.sum(yTrain))
    print('Number of benign feature vectors:', np.sum(1-yTrain))

    print('test x data: ', xTest.shape)
    print('test y data: ', yTest.shape)
    print('Number of anomaly feature fectors:', np.sum(yTest))
    print('Number of benign feature fectors:', np.sum(1-yTest))

    #return xTest, yTest, attackIndexListTest, xTrain, yTrain, attackIndexListTrain, scaler, scalerFunction
    #return yTrain, xTrain, attackIndexListTest, xTest, yTest, attackIndexListTrain, scaler, scalerFunction
    return xTest, yTest, testLineIndex, testFileIndex, attackIndexListTest, xTrain, yTrain, trainLineIndex, trainFileIndex, attackIndexListTrain, scaler, scalerFunction, filenameList

#load dataset as dataframe
#three categories of data
#trainingOnly, trainingIntermediate, testOnly, all
def load_datasetasdf(data):

    #Read config.ini file
    config_object = ConfigParser()
    config_object.read("config.ini")

    if platform.system()=='Linux':
        print('path not given yet!')
    else:
        path = config_object["pathBATADAL"]
        TrainDataRoot = path["pathtrain"]
        TestDataRoot = path["pathtest"]

    if data == 'trainingOnly':
        df = pd.read_csv(TrainDataRoot+"/BATADAL_dataset03.csv",',')
        df['DATETIME']= pd.to_datetime(df['DATETIME'],format='%d/%m/%y %H')
        df['ATT_FLAG']='benign'
    elif data == 'trainingIntermediate':
        df1 = pd.read_csv(TrainDataRoot+"/BATADAL_dataset03.csv",',')
        df1['ATT_FLAG']='benign'
        df1['DATETIME']= pd.to_datetime(df1['DATETIME'],format='%d/%m/%y %H')
        df2 = pd.read_csv(TrainDataRoot+"/BATADAL_dataset04.csv",', ')
        df2['DATETIME']= pd.to_datetime(df2['DATETIME'],format='%d/%m/%y %H')
        df2 = label_intermediate_testdata(df2)
        df = df1.append(df2)
    elif data == 'testOnly':
        df = pd.read_csv(TestDataRoot + "/BATADAL_test_dataset.csv",',')
    elif data == 'all':
        df1 = pd.read_csv(TrainDataRoot+"/BATADAL_dataset03.csv",',')
        df1['ATT_FLAG']='benign'
        df1['DATETIME']= pd.to_datetime(df1['DATETIME'],format='%d/%m/%y %H')
        df2 = pd.read_csv(TrainDataRoot+"/BATADAL_dataset04.csv",', ')
        df2['DATETIME']= pd.to_datetime(df2['DATETIME'],format='%d/%m/%y %H')
        df2 = label_intermediate_testdata(df2)
        df3 = pd.read_csv(TestDataRoot + "/BATADAL_test_dataset.csv",',')
        df3['DATETIME']= pd.to_datetime(df3['DATETIME'],format='%d/%m/%y %H')
        df3 = label_final_testdata(df3)
        df4 = df1.append(df2)
        df = df4.append(df3)
    else:
        print('Please check config-file, given statistics option not availalbe!')

    return df


if __name__ == '__main__':

    # Load Dataset:
    xTest, yTest, lineIndexTest, fileIndexTest, attackIndexListTest, xTrain, yTrain, \
    lineIndexTrain, fileIndexTrain, attackIndexListTrain, \
    scaler, scaleFunction, dataFileNameList = load_BATADAL_Dataset()

    print(pd.DataFrame(xTest))