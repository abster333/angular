
import {globToRegex} from '../src/glob';

describe('globToRegex security', () => {
  it('should escape parentheses in filenames', () => {
    const glob = '/files/foo(1).txt';
    const regex = globToRegex(glob);
    // Current behavior (vulnerable): /files/foo(1)\.txt
    // Expected behavior (secure): /files/foo\(1\)\.txt
    
    // We expect this to FAIL if the bug exists as described, or we can assert the buggy behavior to confirm it.
    // Let's assert the buggy behavior first to confirm the vulnerability.
    expect(regex).toBe('\\/files\\/foo(1)\\.txt');
    
    const re = new RegExp('^' + regex + '$');
    expect(re.test('/files/foo1.txt')).toBe(true); // Matches unintended file
    expect(re.test('/files/foo(1).txt')).toBe(false); // Fails to match intended file
  });

  it('should escape pipe character', () => {
    const glob = '/files/a|b.txt';
    const regex = globToRegex(glob);
    // Current behavior: /files/a|b\.txt
    expect(regex).toBe('\\/files\\/a|b\\.txt');
    
    const re = new RegExp('^' + regex + '$');
    expect(re.test('/files/a')).toBe(true); // Matches 'a' prefix? No, /files/a OR b.txt
    // Regex: \/files\/a|b\.txt
    // Matches "/files/a" OR "b.txt"
    expect(re.test('/files/a')).toBe(true);
    expect(re.test('b.txt')).toBe(true);
  });
  
  it('should allow exclusion bypass via parentheses', () => {
     // This simulates how globListToMatcher uses globToRegex
     const glob = 'secret(1).txt';
     const regexStr = globToRegex(glob);
     const regex = new RegExp('^' + regexStr + '$');
     
     // If we try to exclude 'secret(1).txt', the regex generated is ^secret(1)\.txt$
     // This regex matches 'secret1.txt' but NOT 'secret(1).txt'
     
     expect(regex.test('secret(1).txt')).toBe(false);
     // So the file 'secret(1).txt' does NOT match the exclusion pattern.
     // Therefore it is NOT excluded.
  });
});
