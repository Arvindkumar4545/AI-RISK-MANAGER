import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000' });
const applicantDefaults = { AMT_INCOME_TOTAL: 120000, AMT_CREDIT: 420000, AMT_ANNUITY: 28000, DAYS_BIRTH: -12500, DAYS_EMPLOYED: -2400 };

export default function App() {
  const [token, setToken] = useState(null);
  const [page, setPage] = useState('Dashboard');
  const [form, setForm] = useState(applicantDefaults);
  const [score, setScore] = useState(null);
  const [rate, setRate] = useState(0);

  useEffect(() => { AsyncStorage.getItem('token').then(setToken); }, []);

  const login = async () => {
    const response = await API.post('/api/auth/login', { email: 'analyst@atlas.finance', password: 'demo123' });
    await AsyncStorage.setItem('token', response.data.token);
    setToken(response.data.token);
  };

  const predict = async (stress = false) => {
    const payload = stress ? { data: form, rate_hike_pct: rate } : form;
    const response = await API.post(stress ? '/api/risk/stress-test' : '/api/risk/predict', payload, { headers: { Authorization: `Bearer ${token}` } });
    setScore(response.data);
  };

  if (!token) return <SafeAreaView style={styles.auth}>
    <Text style={styles.logo}>AR</Text>
    <Text style={styles.kicker}>ATLAS RISK</Text>
    <Text style={styles.hero}>Make risk{`\n`}<Text style={styles.mint}>legible.</Text></Text>
    <Text style={styles.muted}>Decision intelligence for lending teams.</Text>
    <TouchableOpacity style={styles.button} onPress={login}><Text style={styles.buttonText}>Enter workspace →</Text></TouchableOpacity>
  </SafeAreaView>;

  return <SafeAreaView style={styles.app}>
    <ScrollView>
      <Text style={styles.kicker}>ATLAS RISK / 23 AUG 2026</Text>
      <Text style={styles.title}>{page}</Text>
      {page === 'Dashboard' && <>
        <Metric label="PORTFOLIO EXPOSURE" value="$18.4M" note="↘ 2.4% this month" />
        <Metric label="AVG DEFAULT PROBABILITY" value="18.6%" note="Healthy book" />
      </>}
      {page === 'History' && <View style={styles.card}><Text style={styles.heading}>Past risk reports</Text>{['Maya Chen · 18.4%', 'Jordan Ellis · 27.1%', 'N. Patel · 63.8%'].map((item) => <Text style={styles.row} key={item}>{item}</Text>)}</View>}
      {(page === 'Risk check' || page === 'Stress lab') && <View style={styles.card}>
        <Text style={styles.heading}>{page}</Text>
        {Object.keys(applicantDefaults).map((key) => <TextInput key={key} style={styles.input} keyboardType="numeric" value={String(form[key])} onChangeText={(value) => setForm({ ...form, [key]: Number(value) })} />)}
        {page === 'Stress lab' && <View style={styles.rate}><TouchableOpacity onPress={() => setRate(Math.max(0, rate - 1))}><Text style={styles.mint}>−</Text></TouchableOpacity><Text style={styles.big}>+{rate}% rate</Text><TouchableOpacity onPress={() => setRate(Math.min(12, rate + 1))}><Text style={styles.mint}>+</Text></TouchableOpacity></View>}
        <TouchableOpacity style={styles.button} onPress={() => predict(page === 'Stress lab')}><Text style={styles.buttonText}>Run assessment →</Text></TouchableOpacity>
        {score && <><Text style={styles.score}>{Math.round(score.risk_score * 100)}%</Text><Text style={score.risk_band === 'High' ? styles.red : styles.mint}>{score.risk_band} risk</Text>{score.top_factors?.map((factor) => <Text style={styles.row} key={factor.feature}>{factor.feature}: {factor.impact}</Text>)}</>}
      </View>}
    </ScrollView>
    <View style={styles.nav}>{['Dashboard', 'Risk check', 'Stress lab', 'History'].map((item) => <TouchableOpacity onPress={() => setPage(item)} key={item}><Text style={page === item ? styles.mint : styles.muted}>{item}</Text></TouchableOpacity>)}</View>
  </SafeAreaView>;
}

function Metric({ label, value, note }) { return <View style={styles.card}><Text style={styles.muted}>{label}</Text><Text style={styles.big}>{value}</Text><Text style={styles.mint}>{note}</Text></View>; }

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#111817', padding: 22 }, auth: { flex: 1, backgroundColor: '#111817', padding: 30, justifyContent: 'center' }, logo: { backgroundColor: '#8ed1bd', color: '#12201d', fontWeight: 'bold', padding: 10, width: 43, marginBottom: 28 }, kicker: { color: '#6e837b', fontSize: 11, letterSpacing: 2 }, hero: { color: '#e9efeb', fontSize: 50, fontWeight: '800', marginVertical: 18 }, mint: { color: '#8ed1bd' }, muted: { color: '#94a09b', fontSize: 13, lineHeight: 21 }, title: { color: '#e9efeb', fontSize: 32, fontWeight: '800', marginVertical: 25 }, card: { backgroundColor: '#19211f', borderColor: '#2c3835', borderWidth: 1, padding: 22, marginBottom: 16 }, big: { color: '#e9efeb', fontSize: 28, fontWeight: '700', marginVertical: 12 }, heading: { color: '#e9efeb', fontSize: 18, fontWeight: '700', marginBottom: 18 }, button: { backgroundColor: '#8ed1bd', padding: 16, marginTop: 18, alignItems: 'center' }, buttonText: { color: '#12201d', fontWeight: '800' }, input: { backgroundColor: '#101716', borderColor: '#2c3835', borderWidth: 1, color: '#e9efeb', padding: 12, marginBottom: 10 }, row: { color: '#c5d0cb', borderBottomColor: '#2c3835', borderBottomWidth: 1, paddingVertical: 14 }, score: { color: '#e9efeb', fontSize: 52, fontWeight: '800', marginTop: 25 }, red: { color: '#e07a5f' }, rate: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }, nav: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 17, borderTopColor: '#2c3835', borderTopWidth: 1 }
});
