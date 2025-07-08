'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Select,
  Spinner,
  Text,
  Heading,
  Flex,
  useToast,
  Center,
  VStack,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Badge,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '~/utils/api';
import type { TimeRange } from '~/server/database';
import { format } from 'date-fns';

interface WorkspaceData {
  _id: string;
  instance: string;
  workspaceId: number;
  eonid: number;
  readRole: string;
  writeRole: string;
  archived: boolean;
  // NEW FIELD: Optional lastUpdated field in the interface
  lastUpdated?: Date;
}

const WorkspaceAnalytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeRange>('lastMonth');
  const [selectedEonId, setSelectedEonId] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  // NEW STATE: For configurable metrics
  const [activityDays, setActivityDays] = useState<number>(45);
  const [newlyCreatedHours, setNewlyCreatedHours] = useState<number>(24);
  const toast = useToast();

  // Get workspaces data (EXISTING QUERY)
  const {
    data: workspaces,
    isLoading: isLoadingWorkspaces,
    error: workspacesError
  } = api.workspace.getAllWorkspaces.useQuery(
    undefined,
    {
      suspense: true,
      onSuccess: (data) => {
        console.log('Workspaces data received', data?.length);
        setIsReady(true);
      },
      onError: (error) => {
        console.error('Workspace error:', error);
      }
    }
  );

  // Get analytics data (EXISTING QUERY)
  const {
    data: analyticsData,
    isLoading: isLoadingAnalytics,
    isFetching: isFetchingAnalytics,
    error: analyticsError
  } = api.workspace.getAnalytics.useQuery(
    {
      range: timeframe,
      eonid: selectedEonId ?? undefined
    },
    {
      enabled: isReady,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        console.log('Analytics data received', data?.length);
      },
      onError: (error) => {
        console.error('Analytics error:', error);
      }
    }
  );

  // NEW QUERY: Get total workspace count
  const {
    data: workspaceCount,
    isLoading: isLoadingCount,
  } = api.workspace.getWorkspaceCount.useQuery(
    { eonid: selectedEonId ?? undefined },
    {
      enabled: isReady,
      refetchOnWindowFocus: false,
    }
  );

  // NEW QUERY: Get newly created workspaces count
  const {
    data: newlyCreatedCount,
    isLoading: isLoadingNewlyCreated,
  } = api.workspace.getNewlyCreatedCount.useQuery(
    { 
      hours: newlyCreatedHours,
      eonid: selectedEonId ?? undefined,
    },
    {
      enabled: isReady,
      refetchOnWindowFocus: false,
    }
  );

  // NEW QUERY: Get active workspaces count
  const {
    data: activeCount,
    isLoading: isLoadingActive,
  } = api.workspace.getActiveCount.useQuery(
    { 
      days: activityDays,
      eonid: selectedEonId ?? undefined,
    },
    {
      enabled: isReady,
      refetchOnWindowFocus: false,
    }
  );

  // NEW QUERY: Get recently created workspaces
  const {
    data: recentWorkspaces,
    isLoading: isLoadingRecent,
  } = api.workspace.getRecentlyCreated.useQuery(
    { 
      limit: 5,
      eonid: selectedEonId ?? undefined,
    },
    {
      enabled: isReady,
      refetchOnWindowFocus: false,
    }
  );

  // Get unique EON IDs (EXISTING LOGIC)
  const eonIds = React.useMemo(() => {
    if (!workspaces?.length) return [];
    return [...new Set(workspaces.map(w => w.eonid))]
      .filter(Boolean)
      .sort((a, b) => a - b);
  }, [workspaces]);

  // Handle filter changes (EXISTING LOGIC)
  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('Timeframe changed to:', e.target.value);
    setTimeframe(e.target.value as TimeRange);
  };

  const handleEonIdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log('EON ID changed to:', value);
    setSelectedEonId(value ? Number(value) : null);
  };

  // NEW HELPER: Convert ObjectId to Date
  const objectIdToDate = (id: string) => {
    const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
    return new Date(timestamp);
  };

  // Calculate loading states (EXISTING LOGIC)
  const isLoading = !isReady || (isLoadingAnalytics && !analyticsData);
  const isUpdating = isFetchingAnalytics && Boolean(analyticsData);

  // Handle errors with toast (EXISTING LOGIC)
  React.useEffect(() => {
    if (workspacesError || analyticsError) {
      toast({
        title: 'Error',
        description: workspacesError?.message || analyticsError?.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });
    }
  }, [workspacesError, analyticsError, toast]);

  return (
    <Box className="w-full space-y-6 p-4">
      <Heading size="md" className="mb-8">
        Workspace Analytics Dashboard
      </Heading>

      {/* Filters (EXISTING UI) */}
      <Flex gap="4" mb="6" flexWrap="wrap">
        <Select
          value={timeframe}
          onChange={handleTimeframeChange}
          width={{ base: 'full', md: '200px' }}
          isDisabled={isLoading}
        >
          <option value="lastWeek">Last 7 Days</option>
          <option value="lastMonth">Last 30 Days</option>
          <option value="last3Months">Last 3 Months</option>
          <option value="lastYear">Last Year</option>
          <option value="last2Years">All Time</option>
        </Select>

        <Select
          value={selectedEonId?.toString() ?? ''}
          onChange={handleEonIdChange}
          width={{ base: 'full', md: '200px' }}
          placeholder="All EON IDs"
          isDisabled={isLoading}
        >
          {eonIds.map((eonid: number) => (
            <option key={`eon-${eonid}`} value={eonid.toString()}>
              {eonid}
            </option>
          ))}
        </Select>
      </Flex>

      {/* NEW UI: Stats Cards */}
      <StatGroup mb="6" gap="4" flexWrap="wrap">
        <Stat
          p="4"
          bg="white"
          borderRadius="md"
          boxShadow="sm"
          minW={{ base: '100%', md: '200px' }}
          flex="1"
        >
          <StatLabel>Total Workspaces</StatLabel>
          <StatNumber>
            {isLoadingCount ? <Spinner size="sm" /> : workspaceCount?.toLocaleString() || 0}
          </StatNumber>
        </Stat>
        
        <Stat
          p="4"
          bg="white"
          borderRadius="md"
          boxShadow="sm"
          minW={{ base: '100%', md: '200px' }}
          flex="1"
        >
          <StatLabel display="flex" alignItems="center">
            Newly Created
            <Box ml="2">
              <NumberInput
                size="xs"
                min={1}
                max={72}
                value={newlyCreatedHours}
                onChange={(_, value) => setNewlyCreatedHours(value)}
                width="80px"
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </Box>
            <Text fontSize="xs" ml="1">hrs</Text>
          </StatLabel>
          <StatNumber>
            {isLoadingNewlyCreated ? <Spinner size="sm" /> : newlyCreatedCount?.toLocaleString() || 0}
          </StatNumber>
        </Stat>
        
        <Stat
          p="4"
          bg="white"
          borderRadius="md"
          boxShadow="sm"
          minW={{ base: '100%', md: '200px' }}
          flex="1"
        >
          <StatLabel display="flex" alignItems="center">
            Active Workspaces
            <Box ml="2">
              <Select
                size="xs"
                value={activityDays}
                onChange={(e) => setActivityDays(Number(e.target.value))}
                width="80px"
              >
                <option value="40">40</option>
                <option value="45">45</option>
                <option value="60">60</option>
                <option value="90">90</option>
                <option value="120">120</option>
              </Select>
            </Box>
            <Text fontSize="xs" ml="1">days</Text>
          </StatLabel>
          <StatNumber>
            {isLoadingActive ? <Spinner size="sm" /> : activeCount?.toLocaleString() || 0}
          </StatNumber>
        </Stat>
      </StatGroup>

      {/* NEW UI: Recently Created Workspaces Table */}
      <Box bg="white" p="4" borderRadius="md" boxShadow="sm" mb="6">
        <Heading size="sm" mb="4">Recently Created Workspaces</Heading>
        {isLoadingRecent ? (
          <Center py="4">
            <Spinner />
          </Center>
        ) : !recentWorkspaces?.length ? (
          <Center py="4">
            <Text>No recent workspaces</Text>
          </Center>
        ) : (
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Instance</Th>
                <Th>Workspace ID</Th>
                <Th>EON ID</Th>
                <Th>Created Date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {recentWorkspaces.map((workspace: any) => (
                <Tr key={workspace._id.toString()}>
                  <Td>{workspace.instance}</Td>
                  <Td>{workspace.workspaceId}</Td>
                  <Td>
                    <Badge colorScheme="blue">{workspace.eonid}</Badge>
                  </Td>
                  <Td>{format(objectIdToDate(workspace._id.toString()), 'MMM dd, yyyy HH:mm')}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>

      {/* Workspace Creation Graph (EXISTING UI) */}
      <Box className="h-[500px] w-full rounded-lg border p-6 bg-white">
        {isLoading ? (
          <Center h="full">
            <VStack spacing={4}>
              <Spinner size="xl" color="blue.500" thickness="4px" />
              <Text>Loading data...</Text>
            </VStack>
          </Center>
        ) : !analyticsData?.length ? (
          <Center h="full">
            <Text>No data available for the selected filters</Text>
          </Center>
        ) : (
          <Box position="relative">
            {isUpdating && (
              <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                bottom="0"
                bg="whiteAlpha.800"
                zIndex="1"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <VStack spacing={2}>
                  <Spinner size="md" color="blue.500" />
                  <Text>Updating...</Text>
                </VStack>
              </Box>
            )}

            <Box zIndex="0">
              <Text className="mb-4 text-sm text-gray-500">
                Data points: {analyticsData.length}
              </Text>
              <LineChart
                width={800}
                height={400}
                data={analyticsData}
                margin={{ top: 20, right: 30, left: 20, bottom: 65 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  height={60}
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
                  }}
                  tick={{
                    angle: -45,
                    textAnchor: 'end',
                    fill: '#4A5568'
                  }}
                />
                <YAxis
                  tick={{ fill: '#4A5568' }}
                  tickFormatter={(value) => value.toFixed(0)}
                  label={{
                    value: 'Number of Workspaces',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: '#4A5568' }
                  }}
                />
                <Tooltip
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value: number) => [value, 'Workspaces']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '8px'
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{
                    paddingBottom: '20px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4299E1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4299E1' }}
                  activeDot={{ r: 6, fill: '#3182CE' }}
                  name="Workspaces Created"
                  isAnimationActive={true}
                />
              </LineChart>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WorkspaceAnalytics;