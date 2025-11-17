import pandas as pd


df = pd.read_csv(r"C:\Users\Michael.Somma\Documents\RMGit\AI_Based_Detector\data\test_DNN-EdgeIIoT_advanced_feature.csv")

print(df.head())

sliced_df = df.loc[:1000, :]

print(sliced_df.head())

sliced_df.to_csv(r"C:\Users\Michael.Somma\Documents\RMGit\AI_Based_Detector\data\test_DNN-EdgeIIoT_advanced_feature.csv")