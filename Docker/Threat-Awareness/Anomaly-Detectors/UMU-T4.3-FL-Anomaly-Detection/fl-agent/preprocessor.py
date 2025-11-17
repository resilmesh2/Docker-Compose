"""
Authors:
- Pablo Fernández Saura (pablofs@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Jorge Bernal Bernabé (jorgebernal@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Antonio Skarmeta (skarmeta@um.es), Dept. of Information and Communications Engineering, University of Murcia
""" 

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.model_selection import train_test_split

NULL_THRESHOLD = 0.3

def remove_high_null_vars(df, logger):
    n_columns = len(df.columns)

    null_pctg = df.isnull().sum() / len(df)
    columns_to_drop = null_pctg[null_pctg > NULL_THRESHOLD].index
    df = df.drop(columns_to_drop, axis=1).reset_index(drop=True)

    pctg_removed = round((len(columns_to_drop)/n_columns) * 100, 2)
    logger.info(f'RESULT: {len(columns_to_drop)} columns '
                f'({pctg_removed}% of total) are dropped since their null values '
                f'percentage excess {NULL_THRESHOLD*100}% threshold')

    return df

def remove_high_null_samples(df, logger):
    n_rows = len(df.index)

    null_pctg = df.isnull().sum(axis=1) / df.shape[1]
    rows_to_drop = null_pctg[null_pctg > NULL_THRESHOLD].index
    df = df.drop(rows_to_drop, axis=0).reset_index(drop=True)

    pctg_removed = round((len(rows_to_drop)/n_rows) * 100, 2)
    logger.info(f'RESULT: {len(rows_to_drop)} columns '
                f'({pctg_removed}% of total) are dropped since their null values '
                f'percentage excess {NULL_THRESHOLD*100}% threshold')

    return df


def imput_nan_values(df, logger):
    # Separamos el dataframe en 2 versiones: uno con las variables categóricas y otro con las numéricas
    num_cols = df._get_numeric_data().columns

    cat_cols = df.select_dtypes(include=['category']).columns

    df_num = df[num_cols]
    df_cat = df[cat_cols]

    nan_num = df_num.isna().sum().sum()
    nan_cat = df_cat.isna().sum().sum()

    # Imputamos NaN usando K-NN con 3 vecinos sobre las variables numéricas
    imputer = KNNImputer(n_neighbors=3, weights="uniform")

    df_num = pd.DataFrame(
        imputer.fit_transform(df_num), columns=num_cols)

    # Imputamos NaN usando SimpleImputer reemplazando por el valor más frecuente sobre las variables categóricas (si las hay)

    if not df_cat.empty:
        imputer = SimpleImputer(strategy='most_frequent')
        df_cat = pd.DataFrame(
            imputer.fit_transform(df_cat), columns=cat_cols)

    logger.info(
        f'RESULT: {nan_num} NaN values on numerical columns, '
        f'and {nan_cat} in categorical columns have been imputed'
    )
    return df_num, df_cat

def label_encode(df, logger):
    # Seleccionamos las variables categóricas (sólo aplicaremos el label encoding sobre ellas)
    cat_cols = df.select_dtypes(include=['category']).columns.tolist()

    le = LabelEncoder()
    if len(cat_cols) == 0:
        logger.info('RESULT: Label encoding was not applied since no category columns were found')

        return df, le
    else:
        df[cat_cols] = df[cat_cols].apply(le.fit_transform)

        logger.info(f'RESULT: Label encoding successfully applied to columns: {cat_cols}')

    return df, le

def normalize_and_split(df, test_size, logger):
    df, scaler = normalize(df, logger, label_present=True)

    X = df.drop(columns=['Label']) 
    y = df['Label'] 

    x_train, x_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=42 
    )

    logger.info(
        'RESULT: Data has been successfully normalized and splitted into training and testing sets'
    )

    return x_train, x_test, y_train, y_test, scaler

def normalize(df, logger, label_present):
    cols_to_normalize = df.columns.tolist()

    if label_present:
        cols_to_normalize.remove("Label")

    scaler = StandardScaler()
    df[cols_to_normalize] = scaler.fit_transform(df[cols_to_normalize])
    logger.info('RESULT: Column values have been normalized by removing the mean and scaling to unit variance')

    return df, scaler


def normalize_w_scaler(df, scaler, logger):
    df = scaler.transform(df)
    logger.info('RESULT: Column values have been normalized by removing the mean and scaling to unit variance')
    return df
    
def remove_label(df, logger):
    if "Label" in df.columns:
        df = df.drop(columns=["Label"])
        logger.info('RESULT: Label column has been successfully removed')
    else:
        logger.info('RESULT: No label column found in the dataframe')
    
    return df

def remove_flow_ids(df, logger):
    logger.info('PROCESSING: Removing flow identificators (flow id, uplink/downlink IPs and ports)...')
    cols_to_remove = ["flowId", "upIp", "DownIp", "upPort", "downPort"]

    df = df.drop(columns=cols_to_remove)

    logger.info(f'RESULT: Flow identificators (columns {cols_to_remove}) have been successfully removed')

    return df

def merge_dataframes(df1, df2):
    df = pd.concat([df1, df2],
                       ignore_index=True, axis=1)
    df.columns = df1.columns.tolist() + df2.columns.tolist()

    return df

def convert_object_to_cat(df, logger):
    object_cols = df.select_dtypes(include=['object']).columns[0]

    df[object_cols] = df[object_cols].astype('category')

    logger.info(
        f'RESULT: Columns [{object_cols}] have been successfully converted to categorical type'
    )

    return df

def replace_inf_to_nan(df, logger):
    numerical_cols = df.select_dtypes(include=[np.number]).columns
    n_inf = (np.isinf(df[numerical_cols])).sum().sum()

    df = df.replace([np.inf, -np.inf], np.nan)

    logger.info(f'RESULT: {n_inf} infinite values have been replaced by NaN')

    return df

