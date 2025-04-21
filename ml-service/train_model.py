import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from joblib import dump


def main():
    # Load dataset (ensure burnout_data.csv is placed in ml-service/data)
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'burnout_data.csv')
    df = pd.read_csv(data_path)

    # Features and target
    X = df[['screen_time', 'breaks', 'last_break']]
    y = df['risk_level']  # numeric labels: 0=low,1=medium,2=high

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Train classifier
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    # Evaluate model
    preds = clf.predict(X_test)
    print('Classification Report:')
    print(classification_report(y_test, preds))

    # Save trained model
    model_path = os.path.join(os.path.dirname(__file__), 'model.joblib')
    dump(clf, model_path)
    print(f'Model saved to {model_path}')


if __name__ == '__main__':
    main()
