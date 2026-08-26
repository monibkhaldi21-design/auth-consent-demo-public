import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Divider,
  Snackbar,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DataViewScreen = ({ navigation }) => {
  const [data, setData] = useState(null);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('lastData');
      if (savedData) {
        setData(JSON.parse(savedData));
      }
    } catch (error) {
      setMessage('خطأ في تحميل البيانات');
      setVisible(true);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setVisible(true);
  };

  if (!data) {
    return (
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.noData}>لا توجد بيانات محفوظة</Text>
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.button}
            >
              العودة
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            البيانات المحفوظة
          </Text>
          <Divider style={styles.divider} />

          <View style={styles.dataRow}>
            <Text style={styles.label}>البريد الإلكتروني:</Text>
            <Text style={styles.value}>{data.email}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.label}>الموافقة:</Text>
            <Text style={styles.value}>
              {data.consent ? '✅ موافق' : '❌ غير موافق'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.label}>وقت الموافقة:</Text>
            <Text style={styles.value}>
              {new Date(data.consent_at).toLocaleString('ar')}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.label}>تشفير كلمة المرور:</Text>
            <Text style={styles.value}>
              {data.hashed ? '🔒 نعم' : '📝 لا'}
            </Text>
          </View>

          {data.consent_text && (
            <View style={styles.dataRow}>
              <Text style={styles.label}>نص الموافقة:</Text>
              <Text style={styles.value}>{data.consent_text}</Text>
            </View>
          )}

          <Divider style={styles.divider} />

          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            العودة
          </Button>
        </Card.Content>
      </Card>

      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
      >
        {message}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  dataRow: {
    marginVertical: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#666',
  },
  value: {
    fontSize: 14,
    marginTop: 4,
    color: '#000',
  },
  noData: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 14,
    color: '#999',
  },
  button: {
    marginVertical: 12,
  },
});

export default DataViewScreen;
